import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import '../styles/pages.css';

// Small dependency-free markdown renderer covering the patterns the
// summary agent actually produces: # / ## / ### headings, **bold**, *italic*,
// `code`, "- bullet" lists, "1. numbered" lists, and blank-line paragraph
// breaks. Everything else falls through as plain text.
function renderInline(text, keyPrefix = 'i') {
  // Order matters: bold (**) before italic (*).
  const tokens = [];
  let remaining = text;
  let idx = 0;
  const patterns = [
    { re: /\*\*([^*]+)\*\*/, tag: 'strong' },
    { re: /__([^_]+)__/,     tag: 'strong' },
    { re: /\*([^*]+)\*/,     tag: 'em' },
    { re: /_([^_]+)_/,       tag: 'em' },
    { re: /`([^`]+)`/,       tag: 'code' },
  ];
  while (remaining.length) {
    let earliest = null;
    for (const p of patterns) {
      const m = p.re.exec(remaining);
      if (m && (earliest === null || m.index < earliest.m.index)) {
        earliest = { m, p };
      }
    }
    if (!earliest) {
      tokens.push(remaining);
      break;
    }
    const { m, p } = earliest;
    if (m.index > 0) tokens.push(remaining.slice(0, m.index));
    const Tag = p.tag;
    tokens.push(<Tag key={`${keyPrefix}-${idx++}`}>{m[1]}</Tag>);
    remaining = remaining.slice(m.index + m[0].length);
  }
  return tokens;
}

function Markdown({ text }) {
  if (!text) return null;
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let buf = [];
  let listType = null; // 'ul' | 'ol' | null
  let listBuf = [];

  const flushParagraph = () => {
    if (buf.length) {
      blocks.push({ kind: 'p', text: buf.join(' ').trim() });
      buf = [];
    }
  };
  const flushList = () => {
    if (listBuf.length) {
      blocks.push({ kind: listType, items: listBuf });
      listBuf = [];
      listType = null;
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    const ul = line.match(/^\s*[-•*]\s+(.*)$/);
    const ol = line.match(/^\s*\d+[.)]\s+(.*)$/);

    if (heading) {
      flushParagraph(); flushList();
      blocks.push({ kind: `h${heading[1].length}`, text: heading[2] });
    } else if (ul) {
      flushParagraph();
      if (listType !== 'ul') { flushList(); listType = 'ul'; }
      listBuf.push(ul[1]);
    } else if (ol) {
      flushParagraph();
      if (listType !== 'ol') { flushList(); listType = 'ol'; }
      listBuf.push(ol[1]);
    } else if (!line.trim()) {
      flushParagraph(); flushList();
    } else {
      flushList();
      buf.push(line);
    }
  }
  flushParagraph(); flushList();

  return (
    <div className="md-summary">
      {blocks.map((b, i) => {
        if (b.kind === 'p')   return <p key={i}>{renderInline(b.text, `p${i}`)}</p>;
        if (b.kind === 'ul')  return <ul key={i}>{b.items.map((it, j) => <li key={j}>{renderInline(it, `u${i}-${j}`)}</li>)}</ul>;
        if (b.kind === 'ol')  return <ol key={i}>{b.items.map((it, j) => <li key={j}>{renderInline(it, `o${i}-${j}`)}</li>)}</ol>;
        const HTag = b.kind; // h1..h6
        return <HTag key={i}>{renderInline(b.text, `h${i}`)}</HTag>;
      })}
    </div>
  );
}

export default function ContentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [content, setContent] = useState(null);
  const [summary, setSummary] = useState(null);
  const [quizzes, setQuizzes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('summary');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const token = localStorage.getItem('token');
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch content status
        const statusRes = await fetch(`${API_URL}/api/v1/content/${id}/status`, { headers });
        if (statusRes.ok) {
          const data = await statusRes.json();
          setContent(data);
        }

        // Fetch summary
        const summaryRes = await fetch(`${API_URL}/api/v1/content/${id}/summary`, { headers });
        if (summaryRes.ok) {
          const data = await summaryRes.json();
          setSummary(data.text);
        }

        // Fetch quizzes for this content
        const quizzesRes = await fetch(`${API_URL}/api/v1/quiz/by-content/${id}`, { headers });
        if (quizzesRes.ok) {
          const data = await quizzesRes.json();
          setQuizzes(data);
        }
      } catch (err) {
        setError('Ошибка при загрузке данных');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (isLoading) {
    return (
      <div className="page-container" style={{ display: 'flex', justifyContent: 'center', marginTop: '4rem' }}>
        <div className="loading-spinner" style={{ borderColor: '#4f46e5', borderTopColor: 'transparent', width: '3rem', height: '3rem' }}></div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="content-card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.9rem', padding: 0, marginBottom: '0.5rem' }}>
              ← Назад
            </button>
            <h2 style={{ margin: 0 }}>📖 Материал #{id}</h2>
          </div>
          {content && (
            <span style={{
              padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '600',
              background: content.status === 'done' ? '#ecfdf5' : '#fffbeb',
              color: content.status === 'done' ? '#10b981' : '#f59e0b',
            }}>
              {content.status === 'done' ? 'Готово' : content.status === 'failed' ? 'Ошибка' : 'Обработка...'}
            </span>
          )}
        </div>
      </div>

      {error && (
        <div style={{ padding: '1rem', background: '#fef2f2', color: '#ef4444', borderRadius: '12px', marginBottom: '1.5rem' }}>{error}</div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <button
          className={`tab-btn ${activeTab === 'summary' ? 'active' : ''}`}
          onClick={() => setActiveTab('summary')}
          style={{ flex: 'none', padding: '0.6rem 1.2rem' }}
        >
          📝 Конспект
        </button>
        <button
          className={`tab-btn ${activeTab === 'tests' ? 'active' : ''}`}
          onClick={() => setActiveTab('tests')}
          style={{ flex: 'none', padding: '0.6rem 1.2rem' }}
        >
          📋 Тесты ({quizzes.length})
        </button>
      </div>

      {/* Summary tab */}
      {activeTab === 'summary' && (
        <div className="content-card">
          {summary ? (
            <Markdown text={summary} />
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
              <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📄</p>
              <p>Конспект ещё не готов. Подождите завершения обработки.</p>
            </div>
          )}
        </div>
      )}

      {/* Tests tab */}
      {activeTab === 'tests' && (
        <div>
          {quizzes.length > 0 ? (
            <div className="tests-grid">
              {quizzes.map(quiz => (
                <div key={quiz.id} className="content-card test-card" style={{ padding: '1.5rem' }}>
                  <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.05rem', color: '#1e293b' }}>{quiz.title}</h3>
                  <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                    📝 {quiz.questions ? quiz.questions.length : 0} вопросов
                  </p>
                  <Link
                    to={`/test/${quiz.id}`}
                    className="btn-generate"
                    style={{ width: '100%', display: 'block', textAlign: 'center', padding: '0.8rem', textDecoration: 'none', margin: 0 }}
                  >
                    Пройти тест 🚀
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="content-card" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
              <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📋</p>
              <p>Тестов пока нет. Они появятся после завершения обработки.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}