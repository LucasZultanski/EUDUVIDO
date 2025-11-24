import React from 'react';

const ValidationModal = ({ isOpen, onClose, errors, title = 'Erro de Validação' }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-dark-surface border border-red-500/30 rounded-xl p-6 max-w-md w-full space-y-4 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
            <p className="text-sm text-text-secondary mb-3">Por favor, corrija os seguintes erros:</p>
            <ul className="space-y-2">
              {errors.map((error, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-red-300">
                  <span className="text-red-500 mt-0.5">•</span>
                  <span>{error}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
       
        <button
          onClick={onClose}
          className="w-full bg-neon-green text-black font-semibold py-3 px-4 rounded-lg transition-transform hover:scale-105"
        >
          Entendi
        </button>
      </div>
    </div>
  );
};

export default ValidationModal;

