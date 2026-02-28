import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const COLUMN_TYPES = [
    { value: 'text', label: 'Text', icon: 'Aa' },
    { value: 'number', label: 'Number', icon: '#' },
    { value: 'date', label: 'Date', icon: '📅' },
    { value: 'checkbox', label: 'Checkbox', icon: '☑' },
    { value: 'select', label: 'Select', icon: '▾' },
    { value: 'url', label: 'URL', icon: '🔗' },
];

// Editable cell component
const EditableCell = ({ value, onChange, type, column }) => {
    const [editing, setEditing] = useState(false);
    const [tempValue, setTempValue] = useState(value || '');
    const inputRef = useRef(null);

    useEffect(() => {
        if (editing && inputRef.current) inputRef.current.focus();
    }, [editing]);

    const commit = () => {
        setEditing(false);
        if (tempValue !== value) onChange(tempValue);
    };

    if (type === 'checkbox') {
        return (
            <div className="flex items-center justify-center h-full">
                <input
                    type="checkbox"
                    checked={!!value}
                    onChange={(e) => onChange(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500/30 cursor-pointer"
                />
            </div>
        );
    }

    if (type === 'select' && column?.options) {
        return (
            <select
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                className="w-full bg-transparent text-sm text-slate-200 border-none outline-none cursor-pointer appearance-none px-2 py-1"
            >
                <option value="" className="bg-slate-900">—</option>
                {column.options.map(opt => (
                    <option key={opt} value={opt} className="bg-slate-900">{opt}</option>
                ))}
            </select>
        );
    }

    if (!editing) {
        return (
            <div
                onClick={() => { setEditing(true); setTempValue(value || ''); }}
                className="px-2 py-1 min-h-[28px] cursor-text text-sm text-slate-200 truncate"
            >
                {type === 'url' && value ? (
                    <a href={value} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline" onClick={e => e.stopPropagation()}>
                        {value}
                    </a>
                ) : (
                    value || <span className="text-slate-600 italic">Empty</span>
                )}
            </div>
        );
    }

    return (
        <input
            ref={inputRef}
            type={type === 'number' ? 'number' : type === 'date' ? 'date' : 'text'}
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
            className="w-full bg-transparent text-sm text-slate-200 border-none outline-none px-2 py-1"
        />
    );
};

const DatabaseView = ({ pageId }) => {
    const { user } = useAuth();
    const [databases, setDatabases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingDbName, setEditingDbName] = useState(null);
    const [showAddColumn, setShowAddColumn] = useState(null);
    const [newColName, setNewColName] = useState('');
    const [newColType, setNewColType] = useState('text');

    const authFetch = useCallback(async (url, options = {}) => {
        return fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${user.token}`,
                ...options.headers,
            },
        });
    }, [user?.token]);

    // Fetch databases for the page
    const fetchDatabases = useCallback(async () => {
        if (!pageId) return;
        try {
            const res = await authFetch(`${API_URL}/databases/page/${pageId}`);
            if (!res.ok) throw new Error('Failed to fetch databases');
            const dbs = await res.json();
            // Fetch rows for each database
            const withRows = await Promise.all(dbs.map(async (db) => {
                const rowRes = await authFetch(`${API_URL}/databases/${db.id}/rows`);
                const rows = rowRes.ok ? await rowRes.json() : [];
                return { ...db, rows, columns: typeof db.columns === 'string' ? JSON.parse(db.columns) : db.columns };
            }));
            setDatabases(withRows);
        } catch (err) {
            console.error('Failed to fetch databases:', err);
        } finally {
            setLoading(false);
        }
    }, [pageId, authFetch]);

    useEffect(() => { fetchDatabases(); }, [fetchDatabases]);

    // Create new database
    const createDatabase = async () => {
        try {
            const res = await authFetch(`${API_URL}/databases`, {
                method: 'POST',
                body: JSON.stringify({ page_id: pageId }),
            });
            if (!res.ok) throw new Error('Failed to create database');
            const newDb = await res.json();
            newDb.columns = typeof newDb.columns === 'string' ? JSON.parse(newDb.columns) : newDb.columns;
            setDatabases(prev => [...prev, newDb]);
        } catch (err) {
            console.error('Failed to create database:', err);
        }
    };

    // Update database name or columns
    const updateDatabase = async (dbId, updates) => {
        try {
            const res = await authFetch(`${API_URL}/databases/${dbId}`, {
                method: 'PUT',
                body: JSON.stringify(updates),
            });
            if (!res.ok) throw new Error('Failed to update database');
            const updated = await res.json();
            updated.columns = typeof updated.columns === 'string' ? JSON.parse(updated.columns) : updated.columns;
            setDatabases(prev => prev.map(d => d.id === dbId ? { ...d, ...updated } : d));
        } catch (err) {
            console.error('Failed to update database:', err);
        }
    };

    // Delete database
    const deleteDatabase = async (dbId) => {
        if (!window.confirm('Delete this database and all its rows?')) return;
        try {
            await authFetch(`${API_URL}/databases/${dbId}`, { method: 'DELETE' });
            setDatabases(prev => prev.filter(d => d.id !== dbId));
        } catch (err) {
            console.error('Failed to delete database:', err);
        }
    };

    // Add row
    const addRow = async (dbId) => {
        try {
            const res = await authFetch(`${API_URL}/databases/${dbId}/rows`, {
                method: 'POST',
                body: JSON.stringify({ data: {} }),
            });
            if (!res.ok) throw new Error('Failed to add row');
            const newRow = await res.json();
            setDatabases(prev => prev.map(d =>
                d.id === dbId ? { ...d, rows: [...(d.rows || []), newRow] } : d
            ));
        } catch (err) {
            console.error('Failed to add row:', err);
        }
    };

    // Update row cell
    const updateRowCell = async (dbId, rowId, colId, value) => {
        const db = databases.find(d => d.id === dbId);
        const row = db?.rows?.find(r => r.id === rowId);
        if (!row) return;
        const newData = { ...(typeof row.data === 'string' ? JSON.parse(row.data) : row.data), [colId]: value };
        try {
            const res = await authFetch(`${API_URL}/databases/${dbId}/rows/${rowId}`, {
                method: 'PUT',
                body: JSON.stringify({ data: newData }),
            });
            if (!res.ok) throw new Error('Failed to update row');
            const updated = await res.json();
            setDatabases(prev => prev.map(d =>
                d.id === dbId ? { ...d, rows: d.rows.map(r => r.id === rowId ? updated : r) } : d
            ));
        } catch (err) {
            console.error('Failed to update row:', err);
        }
    };

    // Delete row
    const deleteRow = async (dbId, rowId) => {
        try {
            await authFetch(`${API_URL}/databases/${dbId}/rows/${rowId}`, { method: 'DELETE' });
            setDatabases(prev => prev.map(d =>
                d.id === dbId ? { ...d, rows: d.rows.filter(r => r.id !== rowId) } : d
            ));
        } catch (err) {
            console.error('Failed to delete row:', err);
        }
    };

    // Add column
    const addColumn = (dbId) => {
        if (!newColName.trim()) return;
        const db = databases.find(d => d.id === dbId);
        if (!db) return;
        const newCol = {
            id: `col_${Date.now()}`,
            name: newColName.trim(),
            type: newColType,
            ...(newColType === 'select' ? { options: ['Option 1', 'Option 2', 'Option 3'] } : {}),
        };
        const updatedCols = [...(db.columns || []), newCol];
        updateDatabase(dbId, { columns: updatedCols });
        setNewColName('');
        setNewColType('text');
        setShowAddColumn(null);
    };

    // Delete column
    const deleteColumn = (dbId, colId) => {
        const db = databases.find(d => d.id === dbId);
        if (!db) return;
        const updatedCols = db.columns.filter(c => c.id !== colId);
        updateDatabase(dbId, { columns: updatedCols });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {databases.map(db => (
                <div key={db.id} className="rounded-xl border border-white/10 bg-slate-900/50 backdrop-blur overflow-hidden">
                    {/* Database Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-slate-800/30">
                        <div className="flex items-center gap-2">
                            <span className="text-lg">🗄️</span>
                            {editingDbName === db.id ? (
                                <input
                                    autoFocus
                                    className="bg-transparent text-white font-semibold text-sm border-none outline-none"
                                    value={db.name}
                                    onChange={(e) => setDatabases(prev => prev.map(d => d.id === db.id ? { ...d, name: e.target.value } : d))}
                                    onBlur={() => { updateDatabase(db.id, { name: db.name }); setEditingDbName(null); }}
                                    onKeyDown={(e) => { if (e.key === 'Enter') { updateDatabase(db.id, { name: db.name }); setEditingDbName(null); } }}
                                />
                            ) : (
                                <h3
                                    className="font-semibold text-sm text-white cursor-pointer hover:text-cyan-400 transition-colors"
                                    onClick={() => setEditingDbName(db.id)}
                                >
                                    {db.name}
                                </h3>
                            )}
                            <span className="text-xs text-slate-500">{(db.rows || []).length} rows</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setShowAddColumn(showAddColumn === db.id ? null : db.id)}
                                className="px-2 py-1 text-xs rounded-md text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all"
                                title="Add column"
                            >
                                + Column
                            </button>
                            <button
                                onClick={() => deleteDatabase(db.id)}
                                className="p-1 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-all"
                                title="Delete database"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Add Column Form */}
                    {showAddColumn === db.id && (
                        <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/20 border-b border-white/5">
                            <input
                                autoFocus
                                placeholder="Column name"
                                value={newColName}
                                onChange={(e) => setNewColName(e.target.value)}
                                className="flex-1 bg-slate-800/50 text-sm text-white rounded-lg px-3 py-1.5 border border-white/10 outline-none focus:border-cyan-500/30"
                                onKeyDown={(e) => { if (e.key === 'Enter') addColumn(db.id); }}
                            />
                            <select
                                value={newColType}
                                onChange={(e) => setNewColType(e.target.value)}
                                className="bg-slate-800/50 text-sm text-white rounded-lg px-2 py-1.5 border border-white/10 outline-none"
                            >
                                {COLUMN_TYPES.map(ct => (
                                    <option key={ct.value} value={ct.value}>{ct.icon} {ct.label}</option>
                                ))}
                            </select>
                            <button
                                onClick={() => addColumn(db.id)}
                                className="px-3 py-1.5 text-xs rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-all"
                            >
                                Add
                            </button>
                            <button
                                onClick={() => { setShowAddColumn(null); setNewColName(''); }}
                                className="p-1 text-slate-500 hover:text-slate-300"
                            >
                                ✕
                            </button>
                        </div>
                    )}

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-white/5">
                                    {(db.columns || []).map(col => (
                                        <th key={col.id} className="text-left px-2 py-2 text-slate-400 font-medium text-xs uppercase tracking-wider group">
                                            <div className="flex items-center gap-1">
                                                <span className="text-slate-500 text-xs">{COLUMN_TYPES.find(t => t.value === col.type)?.icon || 'Aa'}</span>
                                                <span className="truncate">{col.name}</span>
                                                <button
                                                    onClick={() => deleteColumn(db.id, col.id)}
                                                    className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-600 hover:text-red-400 transition-all"
                                                    title="Remove column"
                                                >
                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </th>
                                    ))}
                                    <th className="w-10"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {(db.rows || []).map(row => {
                                    const rowData = typeof row.data === 'string' ? JSON.parse(row.data) : (row.data || {});
                                    return (
                                        <tr key={row.id} className="border-b border-white/5 hover:bg-white/[0.02] group">
                                            {(db.columns || []).map(col => (
                                                <td key={col.id} className="px-1 py-0.5">
                                                    <EditableCell
                                                        value={rowData[col.id]}
                                                        onChange={(val) => updateRowCell(db.id, row.id, col.id, val)}
                                                        type={col.type}
                                                        column={col}
                                                    />
                                                </td>
                                            ))}
                                            <td className="px-1">
                                                <button
                                                    onClick={() => deleteRow(db.id, row.id)}
                                                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-600 hover:text-red-400 rounded transition-all"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Add Row */}
                    <button
                        onClick={() => addRow(db.id)}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/5 transition-all border-t border-white/5"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        New Row
                    </button>
                </div>
            ))}

            {/* Add Database Button */}
            <button
                onClick={createDatabase}
                className="flex items-center gap-2 px-4 py-3 rounded-xl border border-dashed border-white/10 text-slate-500 hover:text-cyan-400 hover:border-cyan-500/30 hover:bg-cyan-500/5 transition-all w-full justify-center"
            >
                <span className="text-lg">🗄️</span>
                <span className="text-sm font-medium">Add Database</span>
            </button>
        </div>
    );
};

export default DatabaseView;
