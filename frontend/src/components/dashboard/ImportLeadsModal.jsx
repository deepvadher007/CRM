import { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import api from '../../services/api';
import { extractErrorMessage } from '../../utils/errorHandler';
import './ImportLeadsModal.css';

const ImportLeadsModal = ({ isOpen, onClose, onImportComplete }) => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const resetState = useCallback(() => {
    setFile(null);
    setPreview(null);
    setImporting(false);
    setResult(null);
    setError(null);
  }, []);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setError(null);
    setResult(null);

    if (!selectedFile) {
      setFile(null);
      setPreview(null);
      return;
    }

    setFile(selectedFile);

    // Parse file client-side for preview
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

        if (jsonData.length < 2) {
          setPreview(null);
          setError('The file appears to be empty or has no data rows.');
          return;
        }

        const headers = jsonData[0] || [];
        const dataRows = jsonData.slice(1);
        const previewRows = dataRows.slice(0, 5);

        setPreview({
          headers,
          rows: previewRows,
          totalRows: dataRows.length
        });
      } catch (err) {
        setPreview(null);
        setError('Failed to parse the Excel file. Please ensure it is a valid .xlsx file.');
      }
    };
    reader.readAsArrayBuffer(selectedFile);
  };

  const handleImport = async () => {
    if (!file) return;

    setImporting(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/api/leads/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setResult(response.data);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to import leads. Please try again.'));
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    const leadsWereImported = result && result.imported > 0;
    resetState();
    if (leadsWereImported) {
      onImportComplete();
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="import-modal-overlay" onClick={handleClose}>
      <div className="import-modal" onClick={(e) => e.stopPropagation()}>
        <button className="import-modal-close" onClick={handleClose} aria-label="Close modal">
          &times;
        </button>
        <h2>Import Leads from Excel</h2>

        {/* File Input */}
        <div className="import-file-input">
          <label htmlFor="import-file">Select an Excel file (.xlsx):</label>
          <input
            type="file"
            id="import-file"
            accept=".xlsx"
            onChange={handleFileChange}
            disabled={importing}
          />
        </div>

        {/* File Info */}
        {file && preview && (
          <div className="import-file-info">
            <p><strong>File:</strong> {file.name}</p>
            <p><strong>Total data rows:</strong> {preview.totalRows}</p>
          </div>
        )}

        {/* Preview Table */}
        {preview && (
          <div className="import-preview-wrapper">
            <h3 style={{ fontSize: '0.95rem', marginBottom: '8px' }}>
              Preview (first {Math.min(5, preview.rows.length)} rows):
            </h3>
            <table className="import-preview-table">
              <thead>
                <tr>
                  {preview.headers.map((header, idx) => (
                    <th key={idx}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row, rowIdx) => (
                  <tr key={rowIdx}>
                    {preview.headers.map((_, colIdx) => (
                      <td key={colIdx}>{row[colIdx] != null ? String(row[colIdx]) : ''}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Loading Spinner */}
        {importing && (
          <div className="import-spinner">
            <div className="spinner"></div>
            <span>Importing leads, please wait...</span>
          </div>
        )}

        {/* Result Summary */}
        {result && (
          <div className="import-result">
            <h3>Import Complete</h3>
            <p>✅ <strong>Imported:</strong> {result.imported}</p>
            <p>⚠️ <strong>Duplicates skipped:</strong> {result.duplicates}</p>
            <p>❌ <strong>Invalid rows:</strong> {result.invalid}</p>
            <p><strong>Total rows processed:</strong> {result.totalRows}</p>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="import-error">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="import-actions">
          {!result && (
            <button
              className="btn btn-primary"
              onClick={handleImport}
              disabled={!file || !preview || importing}
            >
              {importing ? 'Importing...' : 'Import'}
            </button>
          )}
          <button
            className="btn btn-secondary"
            onClick={handleClose}
            disabled={importing}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportLeadsModal;
