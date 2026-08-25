import { useState, useEffect } from 'react';
import './App.css';

const codespaceApiUrl = window.location.hostname.endsWith('.app.github.dev')
  ? `https://${window.location.hostname.replace('-5173.app.github.dev', '-5000.app.github.dev')}`
  : 'http://localhost:5000';
const apiBaseUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '' : codespaceApiUrl);
const API_URL = `${apiBaseUrl}/api/students`;
const MAX_AVATAR_SIZE = 2 * 1024 * 1024;
const PAGE_SIZE = 5;
const initialFormData = {
  studentId: '',
  name: '',
  email: '',
  dateOfBirth: '',
  gender: '',
  className: '',
  major: '',
  phone: '',
  citizenId: '',
  avatarUrl: ''
};

const validateField = (field, value) => {
  const trimmedValue = typeof value === 'string' ? value.trim() : value;
  if (['studentId', 'name', 'email', 'dateOfBirth', 'gender', 'className', 'major'].includes(field) && !trimmedValue) {
    return 'Trường này là bắt buộc.';
  }
  if (field === 'studentId' && !/^\d{6}$/.test(trimmedValue)) {
    return 'MSSV phải gồm đúng 6 chữ số.';
  }
  if (field === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedValue)) {
    return 'Email không đúng định dạng.';
  }
  if (field === 'phone' && trimmedValue && !/^\d{9,11}$/.test(trimmedValue)) {
    return 'Số điện thoại phải gồm 9-11 chữ số.';
  }
  if (field === 'citizenId' && trimmedValue && !/^\d{12}$/.test(trimmedValue)) {
    return 'CCCD phải gồm đúng 12 chữ số.';
  }
  if (field === 'dateOfBirth' && trimmedValue) {
    const birthDate = new Date(trimmedValue);
    const minimumDate = new Date();
    minimumDate.setFullYear(minimumDate.getFullYear() - 18);
    if (birthDate > minimumDate) return 'Sinh viên phải đủ 18 tuổi.';
  }
  return '';
};

function App() {
  const [students, setStudents] = useState([]);
  const [formData, setFormData] = useState(initialFormData);
  const [fieldErrors, setFieldErrors] = useState({});
  const [editingStudent, setEditingStudent] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [majorFilter, setMajorFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortDirection, setSortDirection] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [reportFormat, setReportFormat] = useState('csv');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [status, setStatus] = useState({ type: 'idle', message: 'Sẵn sàng cập nhật dữ liệu sinh viên.' });

  const fetchStudents = async () => {
    try {
      setIsRefreshing(true);
      const response = await fetch(API_URL);
      if (!response.ok) {
        throw new Error('Không thể tải dữ liệu');
      }
      const data = await response.json();
      setStudents(data);
    } catch (error) {
      console.error('Lỗi tải danh sách:', error);
      setStatus({ type: 'error', message: 'Không thể tải danh sách sinh viên.' });
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const nextErrors = Object.fromEntries(
      Object.entries(formData)
        .map(([field, value]) => [field, validateField(field, value)])
        .filter(([, error]) => error)
    );
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setStatus({ type: 'error', message: 'Vui lòng kiểm tra các trường đang báo lỗi.' });
      return;
    }

    const payload = {
      ...formData,
      studentId: formData.studentId.trim(),
      name: formData.name.trim(),
      email: formData.email.trim().toLowerCase(),
      className: formData.className.trim(),
      major: formData.major.trim(),
      phone: formData.phone.trim(),
      citizenId: formData.citizenId.trim()
    };

    try {
      setIsSubmitting(true);
      const response = await fetch(editingStudent ? `${API_URL}/${editingStudent._id}` : API_URL, {
        method: editingStudent ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Lưu thông tin sinh viên thất bại');
      }

      setStatus({ type: 'success', message: editingStudent ? 'Cập nhật sinh viên thành công!' : 'Thêm sinh viên thành công!' });
      await fetchStudents();
      setFormData(initialFormData);
      setFieldErrors({});
      setEditingStudent(null);
    } catch (error) {
      console.error('Lỗi thêm sinh viên:', error);
      setStatus({ type: 'error', message: error.message || 'Không thể thêm sinh viên. Vui lòng kiểm tra lại dữ liệu.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (student) => {
    setSelectedStudent(null);
    setEditingStudent(student);
    setFormData({
      studentId: student.studentId || '',
      name: student.name || '',
      email: student.email || '',
      dateOfBirth: student.dateOfBirth ? student.dateOfBirth.slice(0, 10) : '',
      gender: student.gender || '',
      className: student.className || '',
      major: student.major || '',
      phone: student.phone || '',
      citizenId: student.citizenId || '',
      avatarUrl: student.avatarUrl || ''
    });
    setFieldErrors({});
    setStatus({ type: 'idle', message: 'Đang chỉnh sửa thông tin sinh viên.' });
  };

  const handleDelete = async (student) => {
    if (!window.confirm(`Bạn có chắc muốn xóa sinh viên ${student.name}?`)) return;

    try {
      const response = await fetch(`${API_URL}/${student._id}`, { method: 'DELETE' });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Xóa sinh viên thất bại');
      }

      if (editingStudent?._id === student._id) {
        setEditingStudent(null);
        setFormData(initialFormData);
      }
      setStatus({ type: 'success', message: 'Xóa sinh viên thành công!' });
      setSelectedIds((current) => current.filter((id) => id !== student._id));
      await fetchStudents();
    } catch (error) {
      console.error('Lỗi xóa sinh viên:', error);
      setStatus({ type: 'error', message: error.message || 'Không thể xóa sinh viên.' });
    }
  };

  const cancelEdit = () => {
    setEditingStudent(null);
    setFormData(initialFormData);
    setFieldErrors({});
    setSelectedStudent(null);
    setStatus({ type: 'idle', message: 'Sẵn sàng cập nhật dữ liệu sinh viên.' });
  };

  const handleSortChange = (value) => {
    if (value === sortBy) {
      setSortDirection((current) => current === 'asc' ? 'desc' : 'asc');
      return;
    }
    setSortBy(value);
    setSortDirection('asc');
  };

  const toggleStudentSelection = (studentId) => {
    setSelectedIds((current) => current.includes(studentId)
      ? current.filter((id) => id !== studentId)
      : [...current, studentId]);
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length || isBulkDeleting) return;
    if (!window.confirm(`Bạn có chắc muốn xóa ${selectedIds.length} sinh viên đã chọn?`)) return;

    try {
      setIsBulkDeleting(true);
      const responses = await Promise.all(selectedIds.map((studentId) => fetch(`${API_URL}/${studentId}`, { method: 'DELETE' })));
      const failedResponse = responses.find((response) => !response.ok);
      if (failedResponse) throw new Error('Một số sinh viên chưa được xóa.');
      setSelectedIds([]);
      setStatus({ type: 'success', message: 'Đã xóa các sinh viên được chọn.' });
      await fetchStudents();
    } catch (error) {
      console.error('Lỗi xóa hàng loạt:', error);
      setStatus({ type: 'error', message: error.message || 'Không thể xóa các sinh viên đã chọn.' });
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const closeStudentDetails = () => setSelectedStudent(null);

  const handleFieldChange = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: validateField(field, value) }));
  };

  const handleAvatarChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setFieldErrors((current) => ({ ...current, avatarUrl: 'Vui lòng chọn tệp hình ảnh.' }));
      return;
    }
    if (file.size > MAX_AVATAR_SIZE) {
      setFieldErrors((current) => ({ ...current, avatarUrl: 'Ảnh đại diện không được vượt quá 2MB.' }));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setFormData((current) => ({ ...current, avatarUrl: reader.result }));
      setFieldErrors((current) => ({ ...current, avatarUrl: '' }));
    };
    reader.readAsDataURL(file);
  };

  const handleExportReport = () => {
    if (!filteredStudents.length) {
      setStatus({ type: 'error', message: 'Không có sinh viên phù hợp để xuất báo cáo.' });
      return;
    }

    const headers = ['MSSV', 'Họ tên', 'Email', 'Ngày sinh', 'Giới tính', 'Lớp', 'Ngành học', 'Số điện thoại', 'CCCD'];
    const rows = filteredStudents.map((student) => [
      student.studentId,
      student.name,
      student.email,
      student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString('vi-VN') : '',
      student.gender,
      student.className,
      student.major,
      student.phone,
      student.citizenId
    ]);
    const reportDate = new Date().toISOString().slice(0, 10);
    const fileBaseName = `bao-cao-sinh-vien-${reportDate}`;
    if (reportFormat === 'pdf') {
      const printableRows = rows.map((row) => `<tr>${row.map((value) => `<td>${String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')}</td>`).join('')}</tr>`).join('');
      const printWindow = window.open('', '_blank', 'width=1100,height=700');
      if (!printWindow) {
        setStatus({ type: 'error', message: 'Trình duyệt đã chặn cửa sổ xuất PDF. Hãy cho phép pop-up rồi thử lại.' });
        return;
      }
      printWindow.document.write(`<html><head><title>${fileBaseName}</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#172b3a}h1{font-size:22px}p{color:#53616d}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #dce5e8;padding:8px;text-align:left}th{background:#eaf8f4}</style></head><body><h1>Danh sách sinh viên</h1><p>Ngày xuất: ${new Date().toLocaleDateString('vi-VN')} | Số lượng: ${rows.length}</p><table><thead><tr>${headers.map((header) => `<th>${header}</th>`).join('')}</tr></thead><tbody>${printableRows}</tbody></table></body></html>`);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      setStatus({ type: 'success', message: 'Đã mở bản xem trước PDF để in hoặc lưu tệp.' });
      return;
    }

    const escapeCsvValue = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
    const csvContent = [headers, ...rows].map((row) => row.map(escapeCsvValue).join(',')).join('\n');
    const isExcel = reportFormat === 'excel';
    const blob = isExcel
      ? new Blob([`<html><head><meta charset="UTF-8"></head><body><table><thead><tr>${headers.map((header) => `<th>${header}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((value) => `<td>${String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')}</td>`).join('')}</tr>`).join('')}</tbody></table></body></html>`], { type: 'application/vnd.ms-excel' })
      : new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `${fileBaseName}.${isExcel ? 'xls' : 'csv'}`;
    link.click();
    URL.revokeObjectURL(downloadUrl);
    setStatus({ type: 'success', message: `Đã xuất ${filteredStudents.length} sinh viên ra ${isExcel ? 'Excel' : 'CSV'}.` });
  };

  const totalStudents = students.length;
  const normalizedSearchTerm = searchTerm.trim().toLowerCase();
  const filteredStudents = students
    .filter((student) => {
      if (genderFilter && student.gender !== genderFilter) return false;
      if (majorFilter && student.major !== majorFilter) return false;
      if (!normalizedSearchTerm) return true;
      return [student.studentId, student.name, student.email, student.className, student.major]
        .some((value) => String(value || '').toLowerCase().includes(normalizedSearchTerm));
    })
    .sort((firstStudent, secondStudent) => {
      const firstValue = sortBy === 'createdAt' ? new Date(firstStudent.createdAt || 0).getTime() : String(firstStudent[sortBy] || '').toLowerCase();
      const secondValue = sortBy === 'createdAt' ? new Date(secondStudent.createdAt || 0).getTime() : String(secondStudent[sortBy] || '').toLowerCase();
      const comparison = typeof firstValue === 'number' && typeof secondValue === 'number'
        ? firstValue - secondValue
        : firstValue.localeCompare(secondValue, 'vi');
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const visibleStudents = filteredStudents.slice((safeCurrentPage - 1) * PAGE_SIZE, safeCurrentPage * PAGE_SIZE);
  const visibleStudentIds = visibleStudents.map((student) => student._id);
  const allVisibleSelected = visibleStudentIds.length > 0 && visibleStudentIds.every((id) => selectedIds.includes(id));

  const handleFilterChange = (setter, value) => {
    setter(value);
    setCurrentPage(1);
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Student Management</p>
          <h1>Quản Lý Sinh Viên</h1>
        </div>
        <div className="export-actions">
          <select aria-label="Chọn định dạng báo cáo" value={reportFormat} onChange={(event) => setReportFormat(event.target.value)}>
            <option value="csv">CSV</option>
            <option value="excel">Excel</option>
            <option value="pdf">PDF</option>
          </select>
          <button className="ghost-button" type="button" onClick={handleExportReport} disabled={!filteredStudents.length}>
            Xuất báo cáo
          </button>
        </div>
      </header>

      <section className="stats-grid single-stat">
        <div className="stat-card accent">
          <span className="stat-label">Tổng sinh viên</span>
          <strong>{totalStudents}</strong>
        </div>
      </section>

      <div className="content-grid">
        <section className="panel form-panel">
          <div className="panel-header">
            <div>
              <p className="section-kicker">Hồ sơ sinh viên</p>
              <h2>{editingStudent ? 'Sửa thông tin sinh viên' : 'Thêm thông tin sinh viên'}</h2>
              <p className="panel-description">Điền đầy đủ thông tin để tạo hồ sơ chính xác.</p>
            </div>
            <span className="form-status">{editingStudent ? 'Đang chỉnh sửa' : 'Mẫu mới'}</span>
          </div>

          <form onSubmit={handleSubmit} className="student-form">
            <fieldset>
              <legend>Thông tin cá nhân</legend>
              <label>
                <span>Họ tên <b>*</b></span>
                <input type="text" placeholder="VD: Nguyễn Văn A" value={formData.name} onChange={(e) => handleFieldChange('name', e.target.value)} />
                {fieldErrors.name && <small className="field-error">{fieldErrors.name}</small>}
              </label>
              <div className="form-row">
                <label>
                  <span>Ngày sinh <b>*</b></span>
                  <input type="date" value={formData.dateOfBirth} onChange={(e) => handleFieldChange('dateOfBirth', e.target.value)} />
                  {fieldErrors.dateOfBirth && <small className="field-error">{fieldErrors.dateOfBirth}</small>}
                </label>
                <label>
                  <span>Giới tính <b>*</b></span>
                  <select value={formData.gender} onChange={(e) => handleFieldChange('gender', e.target.value)}>
                    <option value="">Chọn giới tính</option>
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                    <option value="Khác">Khác</option>
                  </select>
                  {fieldErrors.gender && <small className="field-error">{fieldErrors.gender}</small>}
                </label>
              </div>
              <div className="form-row">
                <label>
                  <span>Số điện thoại</span>
                  <input type="tel" placeholder="09xxxxxxxx" value={formData.phone} onChange={(e) => handleFieldChange('phone', e.target.value)} />
                  {fieldErrors.phone && <small className="field-error">{fieldErrors.phone}</small>}
                </label>
                <label>
                  <span>CCCD</span>
                  <input type="text" inputMode="numeric" placeholder="12 chữ số" value={formData.citizenId} onChange={(e) => handleFieldChange('citizenId', e.target.value)} />
                  {fieldErrors.citizenId && <small className="field-error">{fieldErrors.citizenId}</small>}
                </label>
              </div>
              <label>
                <span>Ảnh đại diện</span>
                <input type="file" accept="image/*" onChange={handleAvatarChange} />
                <small className="field-hint">Định dạng ảnh, tối đa 2MB.</small>
                {fieldErrors.avatarUrl && <small className="field-error">{fieldErrors.avatarUrl}</small>}
                {formData.avatarUrl && <img className="avatar-preview" src={formData.avatarUrl} alt="Xem trước ảnh đại diện" />}
              </label>
            </fieldset>

            <fieldset>
              <legend>Thông tin học tập</legend>
              <label>
                <span>MSSV <b>*</b></span>
              <input
                type="text"
                placeholder="VD: 237411"
                value={formData.studentId}
                onChange={(e) => handleFieldChange('studentId', e.target.value)}
              />
                {fieldErrors.studentId && <small className="field-error">{fieldErrors.studentId}</small>}
              </label>
              <div className="form-row">
                <label>
                  <span>Lớp <b>*</b></span>
                  <input type="text" placeholder="VD: SE1801" value={formData.className} onChange={(e) => handleFieldChange('className', e.target.value)} />
                  {fieldErrors.className && <small className="field-error">{fieldErrors.className}</small>}
                </label>
                <label>
                  <span>Ngành học <b>*</b></span>
                  <select value={formData.major} onChange={(e) => handleFieldChange('major', e.target.value)}>
                    <option value="">Chọn ngành học</option>
                    <option value="Công nghệ thông tin">Công nghệ thông tin</option>
                    <option value="Kỹ thuật phần mềm">Kỹ thuật phần mềm</option>
                    <option value="An toàn thông tin">An toàn thông tin</option>
                    <option value="Quản trị kinh doanh">Quản trị kinh doanh</option>
                  </select>
                  {fieldErrors.major && <small className="field-error">{fieldErrors.major}</small>}
                </label>
              </div>
            </fieldset>

            <label>
              <span>Email <b>*</b></span>
              <input
                type="email"
                placeholder="VD: a@gmail.com"
                value={formData.email}
                onChange={(e) => handleFieldChange('email', e.target.value)}
              />
              {fieldErrors.email && <small className="field-error">{fieldErrors.email}</small>}
            </label>

            <div className="form-actions">
              <button type="submit" className="primary-button" disabled={isSubmitting}>
              {isSubmitting ? 'Đang lưu...' : editingStudent ? 'Lưu thay đổi' : 'Thêm sinh viên'}
              </button>
              {editingStudent && (
                <button type="button" className="secondary-button" onClick={cancelEdit}>
                  Hủy chỉnh sửa
                </button>
              )}
            </div>
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
            <div className="table-actions">
              <button type="button" className="refresh-button" onClick={fetchStudents} disabled={isRefreshing}>
                {isRefreshing ? 'Đang tải...' : 'Làm mới'}
              </button>
              <span className="pill">{filteredStudents.length}/{totalStudents} người</span>
            </div>
          </div>

          <div className="list-toolbar">
            <label className="search-field">
              <span>Tìm kiếm</span>
              <input type="search" placeholder="Tìm theo MSSV, họ tên, email..." value={searchTerm} onChange={(event) => handleFilterChange(setSearchTerm, event.target.value)} />
            </label>
            <label>
              <span>Giới tính</span>
              <select value={genderFilter} onChange={(event) => handleFilterChange(setGenderFilter, event.target.value)}>
                <option value="">Tất cả</option>
                <option value="Nam">Nam</option>
                <option value="Nữ">Nữ</option>
                <option value="Khác">Khác</option>
              </select>
            </label>
            <label>
              <span>Ngành học</span>
              <select value={majorFilter} onChange={(event) => handleFilterChange(setMajorFilter, event.target.value)}>
                <option value="">Tất cả</option>
                {[...new Set(students.map((student) => student.major).filter(Boolean))].sort().map((major) => <option key={major} value={major}>{major}</option>)}
              </select>
            </label>
            <label>
              <span>Sắp xếp</span>
              <select value={sortBy} onChange={(event) => handleSortChange(event.target.value)}>
                <option value="createdAt">Ngày tạo</option>
                <option value="name">Họ tên</option>
                <option value="studentId">MSSV</option>
                <option value="className">Lớp</option>
              </select>
            </label>
          </div>

          {selectedIds.length > 0 && (
            <div className="bulk-toolbar">
              <span>Đã chọn <strong>{selectedIds.length}</strong> sinh viên</span>
              <button type="button" className="delete-button" onClick={handleBulkDelete} disabled={isBulkDeleting}>
                {isBulkDeleting ? 'Đang xóa...' : 'Xóa đã chọn'}
              </button>
            </div>
          )}

          {students.length === 0 ? (
            <div className="empty-state">Chưa có dữ liệu sinh viên nào.</div>
          ) : filteredStudents.length === 0 ? (
            <div className="empty-state">Không tìm thấy sinh viên phù hợp.</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th><input type="checkbox" aria-label="Chọn tất cả sinh viên trên trang" checked={allVisibleSelected} onChange={() => setSelectedIds((current) => allVisibleSelected ? current.filter((id) => !visibleStudentIds.includes(id)) : [...new Set([...current, ...visibleStudentIds])])} /></th>
                    <th>MSSV</th>
                    <th>Họ tên</th>
                    <th>Email</th>
                    <th>Lớp</th>
                    <th>Ngành học</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleStudents.map((student) => (
                    <tr key={student._id || student.email} onClick={() => setSelectedStudent(student)}>
                      <td data-label="Chọn"><input type="checkbox" aria-label={`Chọn ${student.name}`} checked={selectedIds.includes(student._id)} onChange={(event) => { event.stopPropagation(); toggleStudentSelection(student._id); }} onClick={(event) => event.stopPropagation()} /></td>
                      <td data-label="MSSV">{student.studentId || '-'}</td>
                      <td data-label="Họ tên">{student.name}</td>
                      <td data-label="Email">{student.email}</td>
                      <td data-label="Lớp">{student.className || '-'}</td>
                      <td data-label="Ngành học">{student.major || '-'}</td>
                      <td data-label="Thao tác" className="row-actions">
                        <button type="button" className="edit-button" onClick={(event) => { event.stopPropagation(); handleEdit(student); }}>Sửa</button>
                        <button type="button" className="delete-button" onClick={(event) => { event.stopPropagation(); handleDelete(student); }}>Xóa</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {filteredStudents.length > 0 && (
            <div className="pagination">
              <span>Trang {safeCurrentPage} / {totalPages}</span>
              <div>
                <button type="button" className="page-button" disabled={safeCurrentPage === 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}>Trước</button>
                {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => <button type="button" className={`page-button ${page === safeCurrentPage ? 'active' : ''}`} key={page} onClick={() => setCurrentPage(page)}>{page}</button>)}
                <button type="button" className="page-button" disabled={safeCurrentPage === totalPages} onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}>Sau</button>
              </div>
            </div>
          )}
        </section>
      </div>

      {selectedStudent && (
        <div className="detail-backdrop" role="presentation" onClick={closeStudentDetails}>
          <section className="detail-modal" role="dialog" aria-modal="true" aria-labelledby="student-detail-title" onClick={(event) => event.stopPropagation()}>
            <div className="detail-header">
              <div>
                <p className="section-kicker">Hồ sơ sinh viên</p>
                <h2 id="student-detail-title">{selectedStudent.name}</h2>
                <p className="detail-subtitle">MSSV {selectedStudent.studentId || '-'}</p>
              </div>
              <button type="button" className="close-button" aria-label="Đóng thông tin" onClick={closeStudentDetails}>×</button>
            </div>
            <div className="detail-content">
              <div className="detail-avatar-wrap">
                {selectedStudent.avatarUrl ? <img className="detail-avatar" src={selectedStudent.avatarUrl} alt={`Ảnh đại diện của ${selectedStudent.name}`} /> : <span className="detail-avatar-fallback">{selectedStudent.name?.charAt(0) || '?'}</span>}
              </div>
              <div className="detail-grid">
                <div><span>Ngày sinh</span><strong>{selectedStudent.dateOfBirth ? new Date(selectedStudent.dateOfBirth).toLocaleDateString('vi-VN') : '-'}</strong></div>
                <div><span>Giới tính</span><strong>{selectedStudent.gender || '-'}</strong></div>
                <div><span>Email</span><strong>{selectedStudent.email || '-'}</strong></div>
                <div><span>Số điện thoại</span><strong>{selectedStudent.phone || '-'}</strong></div>
                <div><span>Lớp</span><strong>{selectedStudent.className || '-'}</strong></div>
                <div><span>Ngành học</span><strong>{selectedStudent.major || '-'}</strong></div>
                <div><span>CCCD</span><strong>{selectedStudent.citizenId || '-'}</strong></div>
              </div>
            </div>
            <div className="detail-footer">
              <button type="button" className="secondary-button" onClick={closeStudentDetails}>Đóng</button>
              <button type="button" className="primary-button detail-edit-button" onClick={() => { closeStudentDetails(); handleEdit(selectedStudent); }}>Chỉnh sửa hồ sơ</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default App;