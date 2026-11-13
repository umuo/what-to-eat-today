import React, { useEffect, useState } from 'react';
import { PinKeypad } from './PinKeypad.jsx';

export function ChangePinModal({
  open,
  username,
  loading,
  error,
  onClearError,
  onClose,
  onSubmit,
}) {
  const [stage, setStage] = useState('current');
  const [currentPin, setCurrentPin] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [showDigits, setShowDigits] = useState(false);

  useEffect(() => {
    if (open) {
      setStage('current');
      setCurrentPin('');
      setPinInput('');
      setShowDigits(false);
    }
  }, [open]);

  useEffect(() => {
    if (error) {
      setPinInput('');
      setStage('current');
      setCurrentPin('');
      setShowDigits(false);
    }
  }, [error]);

  if (!open) return null;

  const handleComplete = (pin4) => {
    if (loading) return;
    if (stage === 'current') {
      onClearError?.();
      setCurrentPin(pin4);
      setPinInput('');
      setShowDigits(true);
      setStage('next');
      return;
    }
    onSubmit(currentPin, pin4);
  };

  return (
    <div
      onClick={() => !loading && onClose()}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1E1B2E]/45 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm bg-white rounded-[28px] p-6 shadow-[0_24px_60px_rgba(109,40,217,0.28)] border border-purple-100 animate-popIn"
      >
        {stage === 'next' && (
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              onClearError?.();
              setStage('current');
              setCurrentPin('');
              setPinInput('');
              setShowDigits(false);
            }}
            className="absolute left-4 top-4 px-2.5 py-1 rounded-full hover:bg-purple-50 text-xs font-semibold text-purple-600 cursor-pointer disabled:opacity-40"
          >
            ← 重新输入原 PIN
          </button>
        )}

        <button
          type="button"
          disabled={loading}
          onClick={onClose}
          aria-label="关闭修改 PIN 弹窗"
          className="absolute right-4 top-4 w-8 h-8 rounded-full hover:bg-purple-50 flex items-center justify-center text-gray-400 hover:text-gray-600 cursor-pointer disabled:opacity-40"
        >
          ✕
        </button>

        <div className="pt-4">
          <div className="text-center mb-4">
            <div className="w-11 h-11 mx-auto mb-2 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center text-xl">
              {stage === 'current' ? '🔐' : '✨'}
            </div>
            <h2 className="text-lg font-bold text-[#2D2346]">
              {stage === 'current' ? '验证原 4 位 PIN 码' : '设置新 4 位 PIN 码'}
            </h2>
            <p className="text-xs text-gray-500 mt-1 px-2">
              {stage === 'current'
                ? `请输入账号「${username}」当前的 4 位保护码`
                : `请为「${username}」设置新的 4 位数字 PIN 码`}
            </p>
          </div>

          {error && (
            <p className="text-center text-xs text-rose-500 font-semibold mb-3 px-2">{error}</p>
          )}

          <PinKeypad
            value={pinInput}
            onChange={(next) => {
              if (next.length > 0 && error) {
                onClearError?.();
              }
              setPinInput(next);
            }}
            onComplete={handleComplete}
            disabled={loading}
            error={error}
            showDigits={showDigits}
            onToggleShowDigits={() => setShowDigits((s) => !s)}
          />

          <p className="text-center text-[11px] text-gray-400 mt-3.5">
            {loading ? '正在更新 PIN 码...' : '点按 4 位数字自动进入下一步'}
          </p>
        </div>
      </div>
    </div>
  );
}
