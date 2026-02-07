import React from 'react';

const Login = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      {/* Login Card */}
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-100">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Welcome Back</h1>
          <p className="text-slate-500 mt-2">Sign in to your productivity hub</p>
        </div>

        <form className="space-y-6">
          {/* Email Field */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Email Address</label>
            <input 
              type="email" 
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              placeholder="name@example.com"
              required 
            />
          </div>

          {/* Password Field */}
          <div>
            <div className="flex justify-between mb-2">
              <label className="text-sm font-semibold text-slate-700">Password</label>
              <a href="#" className="text-sm text-blue-600 hover:underline font-medium">Forgot?</a>
            </div>
            <input 
              type="password" 
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              placeholder="••••••••"
              required 
            />
          </div>

          {/* Remember Me */}
          <div className="flex items-center">
            <input type="checkbox" className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500" />
            <label className="ml-2 text-sm text-slate-600">Remember me for 30 days</label>
          </div>

          {/* Submit Button */}
          <button 
            type="submit" 
            className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transform transition active:scale-[0.98]"
          >
            Sign In
          </button>
        </form>

        <p className="mt-8 text-center text-slate-600 text-sm">
          Don't have an account? <a href="#" className="text-blue-600 font-bold hover:underline">Create one</a>
        </p>
      </div>
    </div>
  );
};

export default Login;