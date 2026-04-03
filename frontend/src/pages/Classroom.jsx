import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import '../styles/pages.css'

export default function Groups({ user }) {
  const [classrooms, setClassrooms] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  
  // Стейты для модального окна/формы создания группы
  const [isCreating, setIsCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Загрузка списка групп
  const fetchClassrooms = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      
      // Бэкенд использует эндпоинт /classroom/my
      const response = await fetch(`${API_URL}/api/v1/classroom/my`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Ошибка при загрузке классов');

      const data = await response.json();
      setClassrooms(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClassrooms();
  }, []);

  // Функция создания нового класса
  const handleCreateClassroom = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      
      const response = await fetch(`${API_URL}/api/v1/classroom/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: newName,
          description: newDesc
        })
      });

      if (!response.ok) throw new Error('Не удалось создать группу');

      // Очищаем форму и заново загружаем список, чтобы увидеть новую группу
      setNewName('');
      setNewDesc('');
      setIsCreating(false);
      fetchClassrooms();

    } catch (err) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading && classrooms.length === 0) {
    return (
      <div className="page-container" style={{ display: 'flex', justifyContent: 'center', marginTop: '4rem' }}>
        <div className="loading-spinner" style={{ borderColor: '#4f46e5', borderTopColor: 'transparent', width: '3rem', height: '3rem' }}></div>
      </div>
    );
  }

  return (
    <div className="dashboard page-container">
      <header className="dashboard-header" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Ваши классы 👥</h1>
          <p className="subtitle" style={{ color: 'white' }}>Управляйте группами студентов и назначайте материалы</p>
        </div>
        
        {user?.role === 'teacher' && !isCreating && (
          <button className="btn-generate" onClick={() => setIsCreating(true)}>
            + Создать класс
          </button>
        )}
      </header>

      {/* Форма создания класса */}
      {isCreating && (
        <div className="content-card" style={{ marginBottom: '2rem', padding: '1.5rem', border: '2px dashed #cbd5e1', background: '#f8fafc' }}>
          <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Создание нового класса</h3>
          <form onSubmit={handleCreateClassroom} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <input 
              type="text" 
              placeholder="Название класса (например: 10-А Информатика)" 
              value={newName} 
              onChange={(e) => setNewName(e.target.value)}
              required
              style={{ padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem' }}
            />
            <input 
              type="text" 
              placeholder="Описание (необязательно)" 
              value={newDesc} 
              onChange={(e) => setNewDesc(e.target.value)}
              style={{ padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem' }}
            />
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button type="submit" className="btn-next" disabled={isSubmitting} style={{ padding: '0.8rem 1.5rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                {isSubmitting ? 'Создание...' : 'Сохранить'}
              </button>
              <button type="button" onClick={() => setIsCreating(false)} style={{ padding: '0.8rem 1.5rem', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                Отмена
              </button>
            </div>
          </form>
        </div>
      )}

      {error ? (
        <div style={{ padding: '2rem', background: '#fee2e2', color: '#991b1b', borderRadius: '12px' }}>
          {error}
        </div>
      ) : (
        <div className="groups-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {classrooms.length > 0 ? (
            classrooms.map(cls => (
              <div key={cls.id} className="content-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#1e293b' }}>{cls.name}</h3>
                  <span style={{ background: '#e0e7ff', color: '#4338ca', padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                    {cls.member_count || 0} учеников
                  </span>
                </div>
                
                {cls.description && (
                  <p style={{ color: '#64748b', fontSize: '0.95rem', margin: '0 0 1.5rem 0', flexGrow: 1 }}>
                    {cls.description}
                  </p>
                )}
                
                <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                  Код-приглашение: <strong style={{ color: '#475569', letterSpacing: '1px' }}>{cls.invite_code}</strong>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
                  <Link to={`/groups/${cls.id}`} className="btn-nav btn-back" style={{ flex: 1, textAlign: 'center', textDecoration: 'none', padding: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    ⚙️ Управление
                  </Link>
                  {/* Кнопка назначить тест пока просто ведет внутрь класса, так как по API назначение идет внутри детализации класса */}
                  <Link to={`/groups/${cls.id}`} className="btn-nav btn-next" style={{ flex: 1, textAlign: 'center', textDecoration: 'none', padding: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    📄 Назначить
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <div style={{ padding: '2rem', background: '#f8fafc', borderRadius: '12px', color: '#64748b', gridColumn: '1 / -1', textAlign: 'center' }}>
              У вас пока нет созданных классов. Нажмите кнопку выше, чтобы создать первый.
            </div>
          )}
        </div>
      )}
    </div>
  )
}