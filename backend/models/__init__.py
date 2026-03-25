# Импортируем все модели чтобы SQLAlchemy зарегистрировал их
# и relationship между моделями работали корректно
from models.user import User, UserRole  # noqa
from models.content import Content, ContentType, ProccesingStatus  # noqa
from models.transcript import Transcript, Summary  # noqa
from models.quiz import Quiz, Question, QuizAttempt  # noqa
from models.feedback import AttemptFeedback  # noqa
from models.classroom import Classroom, ClassroomMember, ClassroomContent, MemberRole  # noqa
