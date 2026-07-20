import React from 'react';

interface PhotoLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  arrivalUrl?: string;
  completionUrl?: string;
}

export const PhotoLightboxModal: React.FC<PhotoLightboxModalProps> = ({
  isOpen,
  onClose,
  title,
  arrivalUrl,
  completionUrl,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800 transition"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h3 className="text-lg font-bold text-slate-100 mb-1">Task Selfies & Verification</h3>
        <p className="text-xs text-slate-400 mb-6">{title}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Arrival Selfie */}
          <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-center">
            <span className="text-xs font-semibold text-emerald-400 block mb-2 uppercase tracking-wider">
              Partner Arrival Selfie
            </span>
            {arrivalUrl ? (
              <img
                src={arrivalUrl}
                alt="Arrival Selfie"
                className="w-full h-64 object-cover rounded-lg border border-slate-800 shadow-md"
              />
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-lg">
                <svg className="w-8 h-8 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                No Arrival Photo Uploaded
              </div>
            )}
          </div>

          {/* Completion Selfie */}
          <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-center">
            <span className="text-xs font-semibold text-cyan-400 block mb-2 uppercase tracking-wider">
              Task Completion Selfie
            </span>
            {completionUrl ? (
              <img
                src={completionUrl}
                alt="Completion Selfie"
                className="w-full h-64 object-cover rounded-lg border border-slate-800 shadow-md"
              />
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-lg">
                <svg className="w-8 h-8 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                No Completion Photo Uploaded
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
