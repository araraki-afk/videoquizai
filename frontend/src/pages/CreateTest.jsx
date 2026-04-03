import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/pages.css';

export default function CreateTest() {
  const navigate = useNavigate();

  // Состояния
  const [inputType, setInputType] = useState('youtube');
  const [inputValue, setInputValue] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fileInputRef = useRef(null);

  // Обработка выбора файла
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

  // Механизм Polling: ожидание завершения работы агентов Celery
  const pollStatus = (contentId, token) => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`${API_URL}/api/v1/content/${contentId}/status`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Ошибка при проверке статуса');
        
        const data = await response.json();
        
        if (data.status === 'processing') {
          setStatusMessage('AI анализирует материал и генерирует вопросы...');
        } else if (data.status === 'done') {
          clearInterval(interval);
          setIsLoading(false);
          setSuccessMsg('Тест успешно сгенерирован!');
          
          // Редирект на страницу управления тестом (если она есть) или на дашборд
          // navigate(`/test/${data.id}`); 
        } else if (data.status === 'failed') {
          clearInterval(interval);
          setIsLoading(false);
          setError(`Ошибка генерации: ${data.error_message || 'Неизвестная ошибка'}`);
        }
      } catch (err) {
        clearInterval(interval);
        setIsLoading(false);
        setError('Потеряно соединение с сервером во время обработки.');
      }
    }, 3000); // Проверяем статус каждые 3 секунды
  };

  // Главный обработчик формы
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setStatusMessage('Отправка данных на сервер...');

    // Валидация
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

      // 1. Формируем правильный запрос в зависимости от типа
      if (inputType === 'youtube') {
        endpoint = '/api/v1/content/url';
        fetchOptions.headers['Content-Type'] = 'application/json';
        fetchOptions.body = JSON.stringify({ url: inputValue });
      } 
      else if (inputType === 'text') {
        endpoint = '/api/v1/content/text';
        fetchOptions.headers['Content-Type'] = 'application/json';
        fetchOptions.body = JSON.stringify({ text: inputValue });
      } 
      else if (inputType === 'file') {
        endpoint = '/api/v1/content/upload';
        // Для файлов используем FormData, браузер сам поставит нужные заголовки multipart/form-data
        const formData = new FormData();
        formData.append('file', selectedFile);
        fetchOptions.body = formData;
      }

      // 2. Отправляем запрос
      const response = await fetch(`${API_URL}${endpoint}`, fetchOptions);
      
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Ошибка при отправке данных');
      }

      const contentData = await response.json();
      
      // 3. Запускаем опрос сервера (polling) по полученному ID
      setStatusMessage('Задача поставлена в очередь...');
      pollStatus(contentData.id, token);

    } catch (err) {
      setError(err.message || 'Произошла ошибка соединения');
      setIsLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="content-card">
        <h2>✨ Создать новый тест</h2>
        <p className="subtitle">Выберите источник материала, и наш AI сгенерирует вопросы.</p>

        <div className="input-tabs">
          <button 
            type="button"
            className={`tab-btn ${inputType === 'youtube' ? 'active' : ''}`}
            onClick={() => { setInputType('youtube'); setError(''); setSuccessMsg(''); }}
            disabled={isLoading}
          >
            <span>🎥</span> YouTube URL
          </button>
          <button 
            type="button"
            className={`tab-btn ${inputType === 'text' ? 'active' : ''}`}
            onClick={() => { setInputType('text'); setError(''); setSuccessMsg(''); }}
            disabled={isLoading}
          >
            <span>📝</span> Текст
          </button>
          <button 
            type="button"
            className={`tab-btn ${inputType === 'file' ? 'active' : ''}`}
            onClick={() => { setInputType('file'); setError(''); setSuccessMsg(''); }}
            disabled={isLoading}
          >
            <span>📁</span> Текстовый файл
          </button>
        </div>

        {error && <div className="error-message" style={{ color: '#ef4444', backgroundColor: '#fef2f2', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', fontWeight: '500' }}>{error}</div>}
        {successMsg && <div className="success-message" style={{ color: '#10b981', backgroundColor: '#ecfdf5', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', fontWeight: '500' }}>{successMsg}</div>}

        <form onSubmit={handleSubmit} className="create-test-form">
          <div className="form-group">
            
            {inputType === 'youtube' && (
              <input
                type="url"
                placeholder="https://www.youtube.com/watch?v=..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                disabled={isLoading}
                className="content-input"
              />
            )}

            {inputType === 'text' && (
              <textarea
                placeholder="Вставьте лекцию, статью или конспект сюда..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                disabled={isLoading}
                className="content-input content-textarea"
              />
            )}

            {inputType === 'file' && (
              <div className="file-upload-area">
                <input
                  type="file"
                  accept=".txt, text/plain"
                  onChange={handleFileChange}
                  disabled={isLoading}
                  ref={fileInputRef}
                  className="file-input"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="file-upload-label">
                  {selectedFile ? (
                    <div className="file-name">
                      <span>📄</span> {selectedFile.name}
                    </div>
                  ) : (
                    <>
                      <div className="upload-icon">☁️</div>
                      <span>Нажмите или перетащите файл сюда (.txt)</span>
                    </>
                  )}
                </label>
              </div>
            )}
          </div>

          <button 
            type="submit" 
            className="btn-generate" 
            disabled={isLoading || (inputType === 'file' ? !selectedFile : !inputValue.trim())}
          >
            {isLoading ? (
              <>
                <span className="loading-spinner"></span>
                {statusMessage}
              </>
            ) : (
              'Сгенерировать тест 🚀'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}