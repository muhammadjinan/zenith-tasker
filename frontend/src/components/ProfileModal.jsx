import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

const ProfileModal = ({ isOpen, onClose }) => {
    const { user, updateProfile, uploadProfilePicture, changePassword, getProfilePicUrl, deactivateAccount, deleteAccount } = useAuth();
    const [activeTab, setActiveTab] = useState('profile');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const fileInputRef = useRef(null);

    // Profile form state
    const [username, setUsername] = useState(user?.username || '');
    const [email, setEmail] = useState(user?.email || '');

    // Password form state
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Danger Zone state
    const [dangerAction, setDangerAction] = useState(null); // 'deactivate' | 'delete' | null
    const [dangerPassword, setDangerPassword] = useState('');
    const [deleteConfirmationInput, setDeleteConfirmationInput] = useState('');

    if (!isOpen) return null;

    const showMessage = (type, text) => {
        setMessage({ type, text });
        setTimeout(() => setMessage({ type: '', text: '' }), 4000);
    };

    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const result = await updateProfile({ username, email: email || undefined });

        if (result.success) {
            showMessage('success', 'Profile updated successfully!');
        } else {
            showMessage('error', result.error);
        }
        setLoading(false);
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            showMessage('error', 'Passwords do not match');
            return;
        }
        if (newPassword.length < 6) {
            showMessage('error', 'Password must be at least 6 characters');
            return;
        }

        setLoading(true);
        const result = await changePassword(currentPassword, newPassword);

        if (result.success) {
            showMessage('success', result.message);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } else {
            showMessage('error', result.error);
        }
        setLoading(false);
    };

    const handlePictureUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            showMessage('error', 'File too large. Max 5MB.');
            return;
        }

        setLoading(true);
        const result = await uploadProfilePicture(file);

        if (result.success) {
            showMessage('success', 'Profile picture updated!');
        } else {
            showMessage('error', result.error);
        }
        setLoading(false);
    };

    const handleDangerSubmit = async (e) => {
        e.preventDefault();

        if (dangerAction === 'delete') {
            if (deleteConfirmationInput !== 'DELETE') {
                showMessage('error', 'Please type DELETE to confirm.');
                return;
            }
        }

        setLoading(true);
        let result;
        if (dangerAction === 'deactivate') {
            result = await deactivateAccount(dangerPassword);
        } else {
            result = await deleteAccount(dangerPassword);
        }

        if (result.success) {
            // User is logged out automatically by context, just close modal
            onClose();
        } else {
            showMessage('error', result.error);
            setLoading(false);
        }
    };

    const profilePicUrl = getProfilePicUrl(user?.profile_pic);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative w-full max-w-lg mx-4 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
                    <h2 className="text-xl font-semibold text-white">Settings</h2>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-white transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-white/10 shrink-0">
                    <button
                        onClick={() => setActiveTab('profile')}
                        className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${activeTab === 'profile'
                            ? 'text-cyan-400 border-b-2 border-cyan-400'
                            : 'text-slate-400 hover:text-white'
                            }`}
                    >
                        Profile
                    </button>
                    <button
                        onClick={() => setActiveTab('security')}
                        className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${activeTab === 'security'
                            ? 'text-cyan-400 border-b-2 border-cyan-400'
                            : 'text-slate-400 hover:text-white'
                            }`}
                    >
                        Security
                    </button>
                </div>

                {/* Message */}
                {message.text && (
                    <div className={`mx-6 mt-4 px-4 py-3 rounded-lg text-sm shrink-0 ${message.type === 'success'
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : 'bg-red-500/20 text-red-400 border border-red-500/30'
                        }`}>
                        {message.text}
                    </div>
                )}

                {/* Content */}
                <div className="p-6 overflow-y-auto">
                    {activeTab === 'profile' && (
                        <form onSubmit={handleProfileSubmit} className="space-y-6">
                            {/* Profile Picture */}
                            <div className="flex flex-col items-center gap-4">
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="relative w-24 h-24 rounded-full bg-slate-800 border-2 border-dashed border-white/20 hover:border-cyan-500/50 cursor-pointer transition-colors overflow-hidden group"
                                >
                                    {profilePicUrl ? (
                                        <img src={profilePicUrl} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="flex items-center justify-center w-full h-full text-slate-500">
                                            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    </div>
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handlePictureUpload}
                                />
                                <p className="text-xs text-slate-500">Click to upload (max 5MB)</p>
                            </div>

                            {/* Username */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Username</label>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
                                />
                            </div>

                            {/* Email */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="your@email.com"
                                    className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
                                />
                                <p className="mt-1 text-xs text-slate-500">Required for password recovery via email</p>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Saving...' : 'Save Changes'}
                            </button>
                        </form>
                    )}

                    {activeTab === 'security' && (
                        <div className="space-y-8">
                            <form onSubmit={handlePasswordSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Current Password</label>
                                    <input
                                        type="password"
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">New Password</label>
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
                                        required
                                        minLength={6}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Confirm New Password</label>
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
                                        required
                                        minLength={6}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-6"
                                >
                                    {loading ? 'Changing...' : 'Change Password'}
                                </button>
                            </form>

                            {/* Danger Zone */}
                            <div className="border-t border-white/10 pt-6">
                                <h3 className="text-red-400 font-semibold mb-4 flex items-center gap-2">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                    Danger Zone
                                </h3>
                                <div className="space-y-3">
                                    <button
                                        type="button"
                                        onClick={() => { setDangerAction('deactivate'); setDangerPassword(''); }}
                                        className="w-full px-4 py-3 border border-yellow-500/30 text-yellow-400 font-medium rounded-xl hover:bg-yellow-500/10 transition-colors text-left flex justify-between items-center"
                                    >
                                        <span>Deactivate Account</span>
                                        <span className="text-xs opacity-70">Temporary</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setDangerAction('delete'); setDangerPassword(''); setDeleteConfirmationInput(''); }}
                                        className="w-full px-4 py-3 border border-red-500/30 text-red-500 font-medium rounded-xl hover:bg-red-500/10 transition-colors text-left flex justify-between items-center"
                                    >
                                        <span>Delete Account</span>
                                        <span className="text-xs opacity-70">Permanent</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Danger Confirmation Modal Overlay */}
            {dangerAction && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setDangerAction(null)} />
                    <div className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl shadow-2xl p-6">
                        <h3 className={`text-xl font-bold mb-2 ${dangerAction === 'delete' ? 'text-red-500' : 'text-yellow-500'}`}>
                            {dangerAction === 'delete' ? 'Delete Account?' : 'Deactivate Account?'}
                        </h3>
                        <p className="text-slate-400 text-sm mb-6">
                            {dangerAction === 'delete'
                                ? 'This action is PERMANENT and cannot be undone. All your data will be wiped immediately.'
                                : 'Your account will be disabled. You can reactivate it by logging in again anytime.'}
                        </p>

                        <form onSubmit={handleDangerSubmit} className="space-y-4">
                            {dangerAction === 'delete' && (
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">
                                        Type <strong>DELETE</strong> to confirm
                                    </label>
                                    <input
                                        type="text"
                                        value={deleteConfirmationInput}
                                        onChange={(e) => setDeleteConfirmationInput(e.target.value)}
                                        className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-white text-sm focus:border-red-500/50 outline-none"
                                        placeholder="DELETE"
                                        required
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">
                                    Verify Password
                                </label>
                                <input
                                    type="password"
                                    value={dangerPassword}
                                    onChange={(e) => setDangerPassword(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-white text-sm focus:border-white/20 outline-none"
                                    placeholder="Enter your password"
                                    required
                                />
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setDangerAction(null)}
                                    className="flex-1 px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-medium hover:bg-slate-700 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className={`flex-1 px-4 py-2 rounded-lg text-white font-medium transition-colors ${dangerAction === 'delete'
                                            ? 'bg-red-600 hover:bg-red-500'
                                            : 'bg-yellow-600 hover:bg-yellow-500'
                                        }`}
                                >
                                    {loading ? 'Processing...' : 'Confirm'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProfileModal;
