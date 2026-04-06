import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/pages.css';

export default function CreateTest() {
  const navigate = useNavigate();

  const [inputType, setInputType] = useState('youtube');
  const [inputValue, setInputValue] = useState('');
  const [title, setTitle] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [questionCount, setQuestionCount] = useState(10);
  const [selectedFile, setSelectedFile] = useState(null);

  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [completedContentId, setCompletedContentId] = useState(null);

  const fileInputRef = useRef(null);
  const pollingRef = useRef(null);

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const handleFileChange = (e) => {
    setError('');
    const file = e.target.files[0];
    if (file) {
      if (file.type !== 'text/plain' && !file.name.endsWith('.txt')) {
        setError('Пожалуйста, загрузите только текстовый файл (.txt)');
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
    }
  };

  const pollStatus = (contentId, token) => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    pollingRef.current = setInterval(async () => {
      try {
        const response = await fetch(`${API_URL}/api/v1/content/${contentId}/status`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Ошибка при проверке статуса');
        const data = await response.json();

        if (data.status === 'processing' || data.status === 'proccesing') {
          setStatusMessage('AI анализирует материал и генерирует вопросы...');
        } else if (data.status === 'done') {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
          setIsLoading(false);
          setCompletedContentId(contentId);
          setSuccessMsg('Тест успешно сгенерирован!');
        } else if (data.status === 'failed') {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
          setIsLoading(false);
          setError(`Ошибка генерации: ${data.error_message || 'Неизвестная ошибка'}`);
        }
      } catch (err) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
        setIsLoading(false);
        setError('Потеряно соединение с сервером.');
      }
    }, 3000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setCompletedContentId(null);
    setStatusMessage('Отправка данных на сервер...');

    if (inputType !== 'file' && !inputValue.trim()) {
      setError('Пожалуйста, заполните поле ввода');
      return;
    }
    if (inputType === 'file' && !selectedFile) {
      setError('Пожалуйста, выберите файл');
      return;
    }

    setIsLoading(true);
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const token = localStorage.getItem('token');

    try {
      let endpoint = '';
      let fetchOptions = {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      };

      if (inputType === 'youtube') {
        endpoint = '/api/v1/content/url';
        fetchOptions.headers['Content-Type'] = 'application/json';
        fetchOptions.body = JSON.stringify({
          url: inputValue,
          title: title.trim() || undefined,
          difficulty,
          question_count: questionCount,
        });
      } else if (inputType === 'text') {
        endpoint = '/api/v1/content/text';
        fetchOptions.headers['Content-Type'] = 'application/json';
        fetchOptions.body = JSON.stringify({
          text: inputValue,
          title: title.trim() || undefined,
          difficulty,
          question_count: questionCount,
        });
      } else if (inputType === 'file') {
        endpoint = '/api/v1/content/upload';
        const formData = new FormData();
        formData.append('file', selectedFile);
        if (title.trim()) formData.append('title', title.trim());
        formData.append('difficulty', difficulty);
        formData.append('question_count', questionCount.toString());
        fetchOptions.body = formData;
      }

      const response = await fetch(`${API_URL}${endpoint}`, fetchOptions);
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Ошибка при отправке данных');
      }

      const contentData = await response.json();
      setStatusMessage('Задача поставлена в очередь...');
      pollStatus(contentData.id, token);
    } catch (err) {
      setError(err.message || 'Произошла ошибка соединения');
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setInputValue('');
    setTitle('');
    setDifficulty('medium');
    setQuestionCount(10);
    setSelectedFile(null);
    setError('');
    setSuccessMsg('');
    setCompletedContentId(null);
    setStatusMessage('');
    setIsLoading(false);
  };

  const difficultyLabels = { easy: 'Лёгкий', medium: 'Средний', hard: 'Сложный' };

  return (
    <div className="page-container">
      <div className="content-card">
        <h2>✨ Создать новый тест</h2>
        <p className="subtitle">Выберите источник материала, и наш AI сгенерирует вопросы.</p>

        {/* Tabs */}
        <div className="input-tabs">
          {[
            { key: 'youtube', icon: '🎥', label: 'YouTube URL' },
            { key: 'text', icon: '📝', label: 'Текст' },
            { key: 'file', icon: '📁', label: 'Файл' },
          ].map(tab => (
            <button
              key={tab.key}
              type="button"
              className={`tab-btn ${inputType === tab.key ? 'active' : ''}`}
              onClick={() => { setInputType(tab.key); setError(''); setSuccessMsg(''); }}
              disabled={isLoading}
            >
              <span>{tab.icon}</span> {tab.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="error-message" style={{ color: '#ef4444', backgroundColor: '#fef2f2', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', fontWeight: '500' }}>
            {error}
          </div>
        )}

        {/* Success banner */}
        {successMsg && (
          <div className="processing-banner processing-done">
            <div className="processing-icon-circle done">✅</div>
            <div className="processing-info">
              <p className="processing-title">{successMsg}</p>
              <p className="processing-subtitle">Откройте конспект и тест, или создайте ещё один материал.</p>
            </div>
            <div className="processing-actions">
              <button className="btn btn-primary btn-large" onClick={() => navigate(`/content/${completedContentId}`)}>
                📖 Открыть конспект →
              </button>
              <button className="btn btn-outline" onClick={handleReset}>
                Создать ещё
              </button>
            </div>
          </div>
        )}

        {/* Processing banner */}
        {isLoading && (
          <div className="processing-banner processing-active">
            <div className="processing-icon-circle working">
              <span className="loading-spinner-large"></span>
            </div>
            <div className="processing-info">
              <p className="processing-title">{statusMessage}</p>
              <p className="processing-subtitle">
                Вы можете свободно пользоваться приложением — тест появится на главной странице.
              </p>
            </div>
            <div className="processing-actions">
              <button className="btn btn-outline" onClick={() => navigate('/')}>На главную</button>
              <button className="btn btn-outline" onClick={() => navigate('/classroom')}>Группы</button>
            </div>
          </div>
        )}

        {/* Form */}
        {!successMsg && (
          <form onSubmit={handleSubmit} className="create-test-form">
            {/* Title */}
            <div className="form-group">
              <label htmlFor="lecture-title">Название лекции</label>
              <input
                id="lecture-title"
                type="text"
                placeholder="Например: Введение в машинное обучение"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isLoading}
                className="content-input"
              />
            </div>

            {/* Source input */}
            <div className="form-group">
              {inputType === 'youtube' && (
                <input type="url" placeholder="https://www.youtube.com/watch?v=..." value={inputValue} onChange={(e) => setInputValue(e.target.value)} disabled={isLoading} className="content-input" />
              )}
              {inputType === 'text' && (
                <textarea placeholder="Вставьте лекцию, статью или конспект сюда..." value={inputValue} onChange={(e) => setInputValue(e.target.value)} disabled={isLoading} className="content-input content-textarea" />
              )}
              {inputType === 'file' && (
                <div className="file-upload-area">
                  <input type="file" accept=".txt, text/plain" onChange={handleFileChange} disabled={isLoading} ref={fileInputRef} className="file-input" id="file-upload" />
                  <label htmlFor="file-upload" className="file-upload-label">
                    {selectedFile ? (
                      <div className="file-name"><span>📄</span> {selectedFile.name}</div>
                    ) : (
                      <><div className="upload-icon">☁️</div><span>Нажмите или перетащите файл (.txt)</span></>
                    )}
                  </label>
                </div>
              )}
            </div>

            {/* Difficulty selector */}
            <div className="form-group">
              <label>Сложность теста</label>
              <div className="difficulty-selector">
                {['easy', 'medium', 'hard'].map(d => (
                  <button
                    key={d}
                    type="button"
                    className={`difficulty-btn ${difficulty === d ? 'active' : ''} difficulty-${d}`}
                    onClick={() => setDifficulty(d)}
                    disabled={isLoading}
                  >
                    {d === 'easy' && '🟢'} {d === 'medium' && '🟡'} {d === 'hard' && '🔴'} {difficultyLabels[d]}
                  </button>
                ))}
              </div>
            </div>

            {/* Question count */}
            <div className="form-group">
              <label htmlFor="question-count">Количество вопросов: <strong>{questionCount}</strong></label>
              <input
                id="question-count"
                type="range"
                min="5"
                max="20"
                step="1"
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                disabled={isLoading}
                className="range-slider"
              />
              <div className="range-labels">
                <span>5</span>
                <span>10</span>
                <span>15</span>
                <span>20</span>
              </div>
            </div>

            <button
              type="submit"
              className="btn-generate"
              disabled={isLoading || (inputType === 'file' ? !selectedFile : !inputValue.trim())}
            >
              {isLoading ? (
                <><span className="loading-spinner"></span>Генерация запущена...</>
              ) : (
                'Сгенерировать тест 🚀'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}