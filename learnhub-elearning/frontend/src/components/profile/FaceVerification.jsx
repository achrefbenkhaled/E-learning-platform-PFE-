import { useState, useRef, useEffect } from 'react';
import { Camera, RefreshCw, CheckCircle, AlertCircle, ShieldCheck } from 'lucide-react';
import api from '../../utils/api.js';
import useAuthStore from '../../context/authStore.js';

const FaceVerification = ({ user, onVerificationSuccess }) => {
  const { setUser } = useAuthStore();
  const [stream, setStream] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (isCapturing && stream && videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(e => console.warn("Video play failed", e));
    }
  }, [isCapturing, stream]);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const startCamera = async () => {
    try {
      setError('');
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
            width: { ideal: 640 }, 
            height: { ideal: 480 },
            facingMode: "user"
        } 
      });
      setStream(mediaStream);
      setIsCapturing(true);
      // Wait for next tick to ensure videoRef is available if it was just rendered
    } catch (err) {
      setError('Could not access camera. Please check permissions and ensure your camera is not used by another app.');
      console.error(err);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setPreviewImage(dataUrl);
    
    // Stop camera
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCapturing(false);
  };

  const resetCapture = () => {
    setPreviewImage(null);
    setSuccess(false);
    setError('');
    startCamera();
  };

  const saveVerification = async () => {
    if (!previewImage) return;

    try {
      setLoading(true);
      setError('');
      const { data } = await api.post('/api/users/verify-face', { faceData: previewImage });
      
      setSuccess(true);
      if (data.user) {
        setUser(data.user);
      }
      if (onVerificationSuccess) {
        onVerificationSuccess(data.user);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save verification data');
    } finally {
      setLoading(false);
    }
  };

  if (user?.isFaceVerified) {
    return (
      <div className="bg-green-500/10 border-2 border-green-500/20 rounded-2xl p-6 mb-6 flex items-center gap-4">
        <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center text-green-500">
          <ShieldCheck className="w-7 h-7" />
        </div>
        <div>
          <h3 className="text-txt font-bold text-lg flex items-center gap-2">
            Identity Verified
            <span className="bg-green-500/20 text-green-500 text-[10px] uppercase font-black px-2 py-0.5 rounded-md">Locked</span>
          </h3>
          <p className="text-txt-muted text-sm mt-1">Your account is permanently linked to your Face ID. You can now take exams securely.</p>
          <div className="bg-surface/50 rounded-lg p-2.5 mt-3 inline-block border border-bdr">
            <p className="text-xs text-txt-secondary font-medium">
              <AlertCircle className="w-3.5 h-3.5 inline mr-1 -translate-y-0.5 text-yellow-500" />
              For security and exam integrity, Face ID cannot be changed once verified.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface-card border-2 border-bdr rounded-2xl p-6 mb-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-indigo-600/10 rounded-xl flex items-center justify-center text-indigo-600">
          <Camera className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-txt font-bold text-lg">Face Verification</h3>
          <p className="text-txt-muted text-sm">Required for taking exams</p>
        </div>
      </div>

      <div className="relative aspect-video bg-black rounded-xl overflow-hidden border-2 border-bdr mb-6 group">
        {!isCapturing && !previewImage && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center p-6">
            <div className="w-16 h-16 bg-surface/10 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/20">
              <Camera className="w-8 h-8 text-white/50" />
            </div>
            <p className="text-white/70 text-sm max-w-xs">Click the button below to start the verification process.</p>
            <button onClick={startCamera} className="btn-primary">
              Verify Account
            </button>
          </div>
        )}

        {isCapturing && (
          <>
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none">
                <div className="w-full h-full border-2 border-indigo-500/50 rounded-[40px] relative">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-64 border-2 border-dashed border-indigo-400/60 rounded-full" />
                </div>
            </div>
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
                <button 
                    onClick={capturePhoto}
                    className="w-16 h-16 bg-white rounded-full p-1.5 shadow-lg active:scale-95 transition-all"
                >
                    <div className="w-full h-full border-4 border-black/10 rounded-full flex items-center justify-center">
                        <div className="w-3 h-3 bg-indigo-600 rounded-full animate-pulse" />
                    </div>
                </button>
            </div>
          </>
        )}

        {previewImage && (
          <div className="relative w-full h-full">
            <img src={previewImage} alt="Preview" className="w-full h-full object-cover" />
            {success ? (
              <div className="absolute inset-0 bg-green-500/80 backdrop-blur-sm flex flex-col items-center justify-center text-white animate-in fade-in duration-300">
                <CheckCircle className="w-16 h-16 mb-4" />
                <h4 className="text-xl font-black">Verification Saved!</h4>
                <p className="text-white/90">Identity successfully verified.</p>
              </div>
            ) : (
                <div className="absolute top-4 right-4">
                    <button 
                        onClick={resetCapture}
                        className="p-2 bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-lg text-white transition-all"
                    >
                        <RefreshCw className="w-5 h-5" />
                    </button>
                </div>
            )}
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {error && (
        <div className="p-3 bg-red-400/10 border border-red-400/20 rounded-xl text-red-500 text-sm flex items-center gap-2 mb-4">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {previewImage && !success && (
        <div className="flex gap-3">
          <button 
            disabled={loading}
            onClick={resetCapture}
            className="flex-1 py-3 px-4 rounded-xl border-2 border-bdr font-bold text-txt hover:bg-surface transition-all flex items-center justify-center gap-2"
          >
            Retake
          </button>
          <button 
            disabled={loading}
            onClick={saveVerification}
            className="flex-[2] btn-primary py-3 flex items-center justify-center gap-2"
          >
            {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
                <>Save Verification</>
            )}
          </button>
        </div>
      )}

      {!previewImage && !isCapturing && !user?.isFaceVerified && (
          <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-4">
            <p className="text-xs text-indigo-400 leading-relaxed font-medium">
                <ShieldCheck className="w-3.5 h-3.5 inline mr-1 -translate-y-0.5" />
                Your photo will be used to verify your identity during exams. 
                Please ensure you are in a well-lit area and looking directly at the camera.
            </p>
          </div>
      )}
    </div>
  );
};

export default FaceVerification;
