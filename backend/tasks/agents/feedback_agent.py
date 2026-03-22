""""
Агент аналитики прохождения теста
Работает синхронно
- Разбирает каждый вопрос (верно/неверно, почему именно эта ошибка)
- Формирует общее резюме прохождения
- Выдает персональные рекомендации: что повторить, на что обратить внимание
- Выделяет сильные стороны (мотивация)
"""
import json
from typing import Any

from sqlalchemy.orm import Session

from core.gpt_client import ask_gpt_json
from models.feedback import AttemptFeedback
from models.quiz import Quiz, QuizAttempt,Question
from models.transcript import Summary

def run_feedback_agent(db: Session, attempt: QuizAttempt) -> AttemptFeedback:
    existing = (
        db.query(AttemptFeedback)
        .filter(AttemptFeedback.attempt_id == attempt.id)
        .first()
    )

    if existing:
        return existing
    
    quiz = db.query(Quiz).filter(Quiz.id == attempt.quiz_id).first()
    if not quiz:
        raise ValueError(f"Quiz {attempt.quiz_id} не найден")
    
    questions_payload = _build_questions_payload(quiz.questions, attempt.answers or {})

    summary = (
        db.query(Summary)
        .filter(Summary.content_id == quiz.content_id)
        .first()
    )
    summary_text = (summary.text if summary else "") or ""

    try:
        llm_result = _ask_llm_feedback(
            quiz_title=quiz.title,
            summary_text=summary_text,
            questions_payload=questions_payload,
            score=attempt.score or 0.0,
        )
        feedback_data = _normalize_llm_result(llm_result,questions_payload)
    except Exception as e:
        print(f"[feedback agent] LLM failed, using fallback: {e}")
        feedback_data = _fallback_feedback(questions_payload, attempt.score or 0.0)

    

#подготовка данных
def _build_questions_payload(
        questions: list[Question], user_answers: dict
) -> list[dict]:
    """
    q.id -> answer -> r/w
    """    
    payload = []
    for q in questions:
        user_answer = (user_answers.get(str(q.id)) or "").strip()
        is_correct = (
            user_answer.lower() == (q.correct_answer or "").strip().lower()
            if user_answer
            else False
        )

        payload.append(
            {
                "question_id": q.id,
                "text": q.text,
                "type": q.question_type,
                "options": q.options,
                "topic": q.topic_tag,
                "correct_answer": q.correct_answer,
                "user_answer": user_answer,
                "is_correct": is_correct,
                "skipped": not bool(user_answer)
            }
        )
    return payload


def _ask_llm_feedback(
        quiz_title: str,
        summary_text: str,
        questions_payload: list[dict],
        score: float,
) -> dict:
    summary_excerpt = summary_text[:3000]

    compact_questions = [
        {
            "id": q["question_id"],
            "text": q["text"],
            "topic": q["topic"],
            "correct_asnwer": q["correct_answer"],
            "is_correct": q["is_correct"],
            "skipped": q["skipped"],
        }
        for q in questions_payload
    ]

    system_prompt = """Ты - опытный преподаватель, который разбирает с учеником его попытку прохождения теста.
    Твоя задача - дать персональный, дружелюбный, но честный разбор.
    
    Верни СТРОГО JSON в формате:
    {
        "overall_summary": "1-2 абзаца: как прошла попытка, что получилось, что нет",
        "mastery_score": 0-100,
        "per_question": [
        {
            "question_id": 42,
            "explanation": "Почему правильный ответ именно такой. Если ученик ошибся - объясни суть ошибки. Если пропустил - объясни материал."
            "mistake_type": "conceptual | "careless" | "knowledge_gap" | "partial" | null"
        }
        ],
        "recommendations": [
        {
            "topic": "Название темы",
            "reason": "Почему стоит повторить (связь с ошибками)",
            "action": "Конкретное действие: 'перечитать раздел X конспекта', 'разобрать пример Y'"
        }
        ],
        "strengths": ["Темы/навыки, где ученик показал уверенное понимание"]
    }
    Требования:
    - per_question должен содержать запись для КАЖДОГО вопроса (и верного, и неверного)
    - mistake_type: conceptual - непонимание сути; careless - невнимательность; knowledge_gap - пробел; partial - почти верно; null - верный ответ
    - 2-5 рекомендаций, приоритет - темам с наибольшим количеством ошибок
    - strengths: 1-3 пункта, если есть верный ответы; пустой список если все плохо
    - пиши на русском, в тоне "преподаватель-наставник": конкретно, ез воды, без "похвалы ради похвалы"
    - mastery_score - твоя оценка понимания, НЕ просто процент правильных. Учитывай сложность тем и вопросов, а также характер ошибок. """

    user_prompt = f"""Название теста: {quiz_title}
    Баллов правильности: {score}%
    Конспект материала: {summary_excerpt if summary_excerpt else "конспект недоступен"}
    Ответы ученика на вопросы: {json.dumps(compact_questions, ensure_ascii=False, indent=2)}
    """
    return ask_gpt_json(system_prompt=system_prompt, user_prompt=user_prompt,max_tokens=2000)

#нормаоизация результата
def _normalize_llm_result(raw: Any, questions_payload: list[dict]) -> dict:
    """если вернули не все, дотягиваем"""
    if not isinstance(raw, dict):
        raw = {}

    llm_per_q: dict[int, dict] = {}
    for item in raw.get("per_question", []) or []:
        if not isinstance(item, dict):
            continue
        qid = item.get("question_id")
        if isinstance(qid, int):
            llm_per_q[qid] = item
    per_question = []
    for q in questions_payload:
        llm_item = llm_per_q.get(q["question_id"], {})
        per_question.append(
            {
                "question_id": q["question_id"],
                "question_text": q["text"],
                "topic": q["topic"],
                "user_answer": q["user_answer"],
                "correct_answer": q["correct_answer"],
                "is_correct": q["is_correct"],
                "skipped": q["skipped"],
                "explanation": str(
                    llm_item.get("explanation")
                    or ("правильный ответ: " + (q["correct_answer"] or ""))
                ),
                "mistake_type": llm_item.get("mistake_type")
                if not q["is_correct"]
                else None,
            }
        )

    recs = raw.get("recommendations") or []
    if not isinstance(recs, list):
        recs = []
    recommendations = []
    for r in recs[:8]:
        if not isinstance(r,dict):
            continue
        recommendations.append({
            "topic": str(r.get("topic", "Основная тема")),
            "reason": str(r.get("reason", "")),
            "action": str(r.get("action", ""))
        })    

    strengths_raw = raw.get("strengths") or []
    if not isinstance(strengths_raw, list):
        strengths_raw = []
    strenghts = [str(s) for s in strengths_raw[:5] if s]

    mastery = raw.get("mastery_score")
    try:
        mastery = float(mastery) if mastery is not None else None
        if mastery is not None:
            mastery = max(0.0, min(100.0, mastery))
    except (TypeError, ValueError):
        mastery = None

    overall = str(raw.get("overall_summary") or "").strip()
    if not overall:
        overall = _default_summary(questions_payload)

    return {
        "overall_summary": overall,
        "mastery_score": mastery,
        "per_question": per_question,
        "recommendations": recommendations,
        "strengths": strenghts,
    }        


#фолбэки

def _fallback_feedback(questions_payload: list[dict], score: float) -> dict:
    """Минимальный детерминированный разбор, если LLM недоступен."""
    wrong_topics: dict[str, int] = {}
    per_question = []
    for q in questions_payload:
        if not q["is_correct"] and q["topic"]:
            wrong_topics[q["topic"]] = wrong_topics.get(q["topic"], 0) + 1

        per_question.append(
            {
                "question_id": q["question_id"],
                "question_text": q["text"],
                "topic": q["topic"],
                "user_answer": q["user_answer"],
                "correct_answer": q["correct_answer"],
                "is_correct": q["is_correct"],
                "skipped": q["skipped"],
                "explanation": (
                    "Вы ответили верно." if q["is_correct"]
                    else f"Правильный ответ: {q['correct_answer']}"
                ),
                "mistake_type": None if q["is_correct"] else "knowledge_gap",
            }
        )

    # топ 3 темы с ошибками → рекомендации
    recommendations = [
        {
            "topic": topic,
            "reason": f"Допущено ошибок: {count}",
            "action": "Перечитайте соответствующий раздел конспекта и попробуйте пройти тест ещё раз.",
        }
        for topic, count in sorted(wrong_topics.items(), key=lambda x: -x[1])[:3]
    ]

    strengths = []
    correct_topics: dict[str, int] = {}
    for q in questions_payload:
        if q["is_correct"] and q["topic"]:
            correct_topics[q["topic"]] = correct_topics.get(q["topic"], 0) + 1
    for topic, _ in sorted(correct_topics.items(), key=lambda x: -x[1])[:3]:
        if topic not in wrong_topics:
            strengths.append(f"Хорошее понимание темы «{topic}»")

    return {
        "overall_summary": _default_summary(questions_payload),
        "mastery_score": float(score),
        "per_question": per_question,
        "recommendations": recommendations,
        "strengths": strengths,
    }


def _default_summary(questions_payload: list[dict]) -> str:
    total = len(questions_payload)
    correct = sum(1 for q in questions_payload if q["is_correct"])
    skipped = sum(1 for q in questions_payload if q["skipped"])
    if total == 0:
        return "В тесте не было вопросов."
    pct = round(correct / total * 100)
    if pct >= 85:
        tone = "Отличный результат — вы хорошо освоили материал."
    elif pct >= 60:
        tone = "Хороший результат, но есть темы, которые стоит доработать."
    elif pct >= 40:
        tone = "Результат средний — несколько ключевых тем стоит повторить."
    else:
        tone = "Материал ещё не усвоен — рекомендуем вернуться к конспекту и попробовать снова."
    suffix = f" Пропущено вопросов: {skipped}." if skipped else ""
    return f"Правильных ответов: {correct} из {total} ({pct}%). {tone}{suffix}"