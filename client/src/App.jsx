import { useState, useEffect } from 'react';
import './App.css';

// URL Backend Công khai trên GitHub Codespaces của bạn
const API_URL = 'https://potential-space-capybara-pjvjv49gx5vpcrvr4-5000.app.github.dev/api/students';

function App() {
  const [students, setStudents] = useState([]);
  const [formData, setFormData] = useState({
    studentId: '',
    name: '',
    email: ''
  });
  const [status, setStatus] = useState({ type: 'idle', message: 'Sẵn sàng cập nhật dữ liệu sinh viên.' });

  const fetchStudents = async () => {
    try {
      const response = await fetch(API_URL);
      if (!response.ok) {
        throw new Error('Không thể tải dữ liệu');
      }
      const data = await response.json();
      setStudents(data);
    } catch (error) {
      console.error('Lỗi tải danh sách:', error);
      setStatus({ type: 'error', message: 'Không thể tải danh sách sinh viên.' });
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error('Thêm sinh viên thất bại');
      }

      setStatus({ type: 'success', message: 'Thêm sinh viên thành công!' });
      fetchStudents();
      setFormData({ studentId: '', name: '', email: '' });
    } catch (error) {
      console.error('Lỗi thêm sinh viên:', error);
      setStatus({ type: 'error', message: 'Không thể thêm sinh viên. Vui lòng kiểm tra lại dữ liệu.' });
    }
  };

  const totalStudents = students.length;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Student Management</p>
          <h1>Quản Lý Sinh Viên</h1>
        </div>
        <button className="ghost-button" type="button">
          Xuất báo cáo
        </button>
      </header>

      <section className="stats-grid">
        <div className="stat-card accent">
          <span className="stat-label">Tổng sinh viên</span>
          <strong>{totalStudents}</strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">Đang hoạt động</span>
          <strong>{totalStudents > 0 ? '98%' : '0%'}</strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">Cập nhật mới</span>
          <strong>{totalStudents > 0 ? 'Hôm nay' : 'Chưa có'}</strong>
        </div>
      </section>

      <div className="content-grid">
        <section className="panel form-panel">
          <div className="panel-header">
            <h2>Thêm sinh viên mới</h2>
          </div>

          <form onSubmit={handleSubmit} className="student-form">
            <label>
              <span>MSSV</span>
              <input
                type="text"
                placeholder="VD: SE170001"
                value={formData.studentId}
                onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                required
              />
            </label>

            <label>
              <span>Họ tên</span>
              <input
                type="text"
                placeholder="VD: Nguyễn Văn A"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </label>

            <label>
              <span>Email</span>
              <input
                type="email"
                placeholder="VD: a@gmail.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </label>

            <button type="submit" className="primary-button">
              Thêm sinh viên
            </button>
          </form>

          {status.message && (
            <div className={`status-banner ${status.type}`}>
              {status.message}
            </div>
          )}
        </section>

        <section className="panel table-panel">
          <div className="panel-header">
            <h2>Danh sách sinh viên</h2>
            <span className="pill">{totalStudents} người</span>
          </div>

          {students.length === 0 ? (
            <div className="empty-state">Chưa có dữ liệu sinh viên nào.</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>MSSV</th>
                    <th>Họ tên</th>
                    <th>Email</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student._id || student.email}>
                      <td>{student.studentId || '-'}</td>
                      <td>{student.name}</td>
                      <td>{student.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default App;