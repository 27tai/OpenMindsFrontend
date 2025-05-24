import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext'; // Assuming this provides register, isAuthenticated
import axios from 'axios';

const Register = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { register, isAuthenticated } = useAuth();
  const { fromLogin, email, userId, message, userData } = location.state || {};
  const isProfileUpdate = fromLogin === true;

  const [formData, setFormData] = useState({
    email: '', password: '', confirmPassword: '', fullName: '',
    phone_number: '', date_of_birth: '', adminSecret: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState(false);
  const [registerError, setRegisterError] = useState(''); // For form submission errors
  const [successMessage, setSuccessMessage] = useState('');

  const [showCamera, setShowCamera] = useState(false);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null); // This will hold the Base64 image string
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraError, setCameraError] = useState(null);

  // Initialize form data
  useEffect(() => {
    if (isProfileUpdate && userData) {
      console.log("Setting form data from userData:", userData);
      setFormData({
        email: userData.email || '',
        fullName: userData.full_name || '',
        phone_number: userData.phone_number || '',
        date_of_birth: userData.date_of_birth ?
          (typeof userData.date_of_birth === 'string' ?
            userData.date_of_birth.split('T')[0] :
            new Date(userData.date_of_birth).toISOString().split('T')[0]) :
          '',
        password: '', confirmPassword: '', adminSecret: formData.adminSecret
      });
      // Do NOT set capturedImage from userData.profile_image_url here,
      // as the requirement is to capture a NEW picture for updates.
    } else if (email && !isProfileUpdate) {
      setFormData(prev => ({ ...prev, email }));
    }
  }, [isProfileUpdate, userData, email]);

  // Redirect if already authenticated and not updating profile
  useEffect(() => {
    if (isAuthenticated && !isProfileUpdate) {
      navigate('/');
    }
  }, [isAuthenticated, navigate, isProfileUpdate]);

  // Effect for attaching/detaching video element event listeners
  useEffect(() => {
    const videoElement = videoRef.current;
    if (showCamera && videoElement) {
      console.log("VIDEO_EVENT_EFFECT: Attaching event listeners.");
      const handleLoadedMetadata = () => {
        console.log("VIDEO_EVENT: onloadedmetadata. Dimensions:", videoElement.videoWidth, "x", videoElement.videoHeight);
        if (videoElement.paused) videoElement.play().then(() => console.log("VIDEO_PLAY: play() from onloadedmetadata.")).catch(err => { console.error("VIDEO_PLAY_ERROR from onloadedmetadata:", err); setCameraError(`Error playing video: ${err.message}.`); });
      };
      const handlePlaying = () => { console.log("VIDEO_EVENT: onplaying."); setCameraError(null); };
      const handleError = (e) => { console.error("VIDEO_ELEMENT_ERROR:", e, videoElement.error); setCameraError(`Video error: ${videoElement.error?.message} (Code: ${videoElement.error?.code})`); };
      const eventListeners = { loadedmetadata: handleLoadedMetadata, playing: handlePlaying, error: handleError, canplay: () => console.log("VIDEO_EVENT: oncanplay."), waiting: () => console.warn("VIDEO_EVENT: onwaiting."), stalled: () => console.warn("VIDEO_EVENT: onstalled.") };
      Object.entries(eventListeners).forEach(([event, handler]) => videoElement.addEventListener(event, handler));
      return () => { console.log("VIDEO_EVENT_EFFECT: Cleaning up listeners."); Object.entries(eventListeners).forEach(([event, handler]) => videoElement.removeEventListener(event, handler)); };
    }
  }, [showCamera]);

  // useEffect to start the camera stream
  useEffect(() => {
    const startStream = async () => {
      if (isStartingCamera && videoRef.current && !streamRef.current) {
        console.log("EFFECT_START_STREAM: videoRef ready, attempting getUserMedia.");
        setCameraError(null);
        if (streamRef.current || (videoRef.current && videoRef.current.srcObject)) { /* Defensive cleanup */ }
        try {
          const constraints = { video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }, audio: false };
          const newStream = await navigator.mediaDevices.getUserMedia(constraints);
          console.log("EFFECT_START_STREAM: Stream obtained.", newStream);
          streamRef.current = newStream;
          if (videoRef.current) videoRef.current.srcObject = newStream; else throw new Error("videoRef became null post-stream.");
        } catch (err) {
          console.error('EFFECT_START_STREAM_ERROR: getUserMedia failed:', err.name, err.message);
          let userMessage = "Could not access camera."; /* More detailed messages based on err.name */
          if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") userMessage = "No camera found."; else if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") userMessage = "Camera permission denied."; else if (err.name === "NotReadableError" || err.name === "TrackStartError") userMessage = "Camera in use or hardware error."; else if (err.name === "OverconstrainedError" || err.name === "ConstraintNotSatisfiedError") userMessage = `Camera doesn't support settings: ${err.message}`; else if (err.name === "AbortError") userMessage = "Camera access aborted."; else if (err.name === "SecurityError") userMessage = "Camera access blocked (HTTPS required or security setting)."; else userMessage = `Camera error: ${err.name}.`;
          setCameraError(userMessage); setShowCamera(false); setIsStartingCamera(false);
          if (streamRef.current) { streamRef.current.getTracks().forEach(track => track.stop()); streamRef.current = null; }
        }
      }
    };
    startStream();
  }, [isStartingCamera, videoRef.current]); // videoRef.current in deps for direct re-check if it changes

  // Cleanup effect for component unmount
  useEffect(() => {
    return () => {
      console.log("COMPONENT_UNMOUNT: Stopping camera if active.");
      if (streamRef.current) { streamRef.current.getTracks().forEach(track => track.stop()); streamRef.current = null; }
      if (videoRef.current && videoRef.current.srcObject) videoRef.current.srcObject = null;
    };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.fullName.trim()) errors.fullName = 'Full name is required';
    else if (formData.fullName.length < 2) errors.fullName = 'Full name min 2 chars';
    if (!formData.phone_number?.trim()) errors.phone_number = 'Phone number is required';
    else if (!/^\d{10,15}$/.test(formData.phone_number.replace(/[^0-9]/g, ''))) errors.phone_number = 'Phone must be 10-15 digits';
    if (!formData.date_of_birth) errors.date_of_birth = 'Date of birth is required';

    if (!isProfileUpdate) {
      if (!formData.email.trim()) errors.email = 'Email is required';
      else if (!/\S+@\S+\.\S+/.test(formData.email)) errors.email = 'Email is invalid';
      if (!formData.password) errors.password = 'Password is required';
      else if (formData.password.length < 6) errors.password = 'Password min 6 chars';
      if (formData.password !== formData.confirmPassword) errors.confirmPassword = 'Passwords do not match';
    } else {
      // **NEW VALIDATION: Profile update requires a new picture to be captured**
      if (!capturedImage) {
        errors.profilePhoto = 'A new profile picture must be captured to update your profile.';
      }
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleOpenCamera = () => {
    console.log("HANDLE_OPEN_CAMERA: Clicked.");
    if (streamRef.current) { streamRef.current.getTracks().forEach(track => track.stop()); streamRef.current = null; }
    if (videoRef.current && videoRef.current.srcObject) { (videoRef.current.srcObject).getTracks().forEach(track => track.stop()); videoRef.current.srcObject = null; }
    setCameraError(null); setCapturedImage(null); setShowCamera(true); setIsStartingCamera(true);
  };

  const stopCamera = () => {
    console.log("STOP_CAMERA: User clicked cancel/stop.");
    setShowCamera(false); setIsStartingCamera(false);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => { console.log(`STOP_CAMERA: Stopping track - ${track.label}`); track.stop(); });
      streamRef.current = null; console.log("STOP_CAMERA: streamRef nullified.");
    }
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject = null; videoRef.current.load(); console.log("STOP_CAMERA: videoRef.srcObject nullified & loaded.");
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && videoRef.current.srcObject && videoRef.current.readyState >= videoRef.current.HAVE_CURRENT_DATA && videoRef.current.videoWidth > 0) {
      console.log("CAPTURE_PHOTO: Capturing.");
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth; canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (videoRef.current.style.transform === 'scaleX(-1)') { ctx.translate(canvas.width, 0); ctx.scale(-1, 1); }
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const imageData = canvas.toDataURL('image/jpeg');
      setCapturedImage(imageData); console.log("CAPTURE_PHOTO: Captured.");
      stopCamera();
    } else {
      console.warn("CAPTURE_PHOTO_WARN: Video not ready or zero dimensions.");
      setCameraError("Cannot capture, camera feed not ready or zero dimensions.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (validateForm()) {
      setIsSubmitting(true); setRegisterError('');
      try {
        let dataPayload;
        const image_to_send = capturedImage; // Base64 string

        if (isProfileUpdate) {
          let formattedDate = formData.date_of_birth;
          if (formData.date_of_birth && typeof formData.date_of_birth === 'string') formattedDate = formData.date_of_birth.split('T')[0];
          dataPayload = {
            full_name: formData.fullName, phone_number: formData.phone_number, date_of_birth: formattedDate,
            ...(image_to_send && { profile_image_base64: image_to_send }) // Include if captured
          };
          console.log('Updating profile with data:', dataPayload); // Log actual payload
          const token = localStorage.getItem('token');
          if (!token) { setRegisterError('Auth required.'); setIsSubmitting(false); return; }
          const response = await axios.patch( `https://openmindsbackend.onrender.com/api/auth/users/${userId}`, dataPayload, { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } });
          setRegisterSuccess(true); setSuccessMessage('Profile updated! Redirecting...');
          setTimeout(() => navigate('/'), 2000);
        } else { // Registration
          const { confirmPassword, ...restData } = formData;
          dataPayload = {
            full_name: restData.fullName, email: restData.email, password: restData.password,
            phone_number: restData.phone_number, date_of_birth: restData.date_of_birth,
            ...(image_to_send && { profile_image_base64: image_to_send }) // Include if captured
          };
          if (restData.adminSecret) dataPayload.admin_secret = restData.adminSecret;
          console.log('Registering with data:', dataPayload); // Log actual payload
          // Using direct axios call as per previous logic; replace with useAuth's register if it handles images
          const response = await axios.post('https://openmindsbackend.onrender.com/api/auth/register', dataPayload, { headers: { 'Content-Type': 'application/json' } });
          setRegisterSuccess(true); setSuccessMessage('Registered! Redirecting to login...');
          setTimeout(() => navigate('/login'), 2000);
        }
      } catch (err) {
        console.error('Submit error:', err.response?.data || err.message || err);
        setRegisterError(err.response?.data?.message || 'Operation failed. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    } else {
        console.log("Form validation failed:", formErrors);
    }
  };

  if (registerSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="rounded-md bg-green-50 p-4"><div className="flex"><div className="flex-shrink-0"><svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg></div><div className="ml-3"><h3 className="text-sm font-medium text-green-800">Success</h3><div className="mt-2 text-sm text-green-700"><p>{successMessage || 'Operation completed successfully!'}</p></div></div></div></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {isProfileUpdate ? 'Complete Your Profile' : 'Create a new account'}
          </h2>
          {message && <div className="mt-2 text-center text-sm text-indigo-600">{message}</div>}
          {!isProfileUpdate && (
            <p className="mt-2 text-center text-sm text-gray-600">
              Or{' '} <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">sign in to your existing account</Link>
            </p>
          )}
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {/* Email Field */}
          <div><label htmlFor="email" className="block text-sm font-medium text-gray-700">Email address</label><input id="email" name="email" type="email" autoComplete="email" required={!isProfileUpdate} className={`mt-1 appearance-none rounded-md relative block w-full px-3 py-2 border ${formErrors.email ? 'border-red-500' : 'border-gray-300'} placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm ${isProfileUpdate ? 'bg-gray-100' : ''}`} placeholder="Email address" value={formData.email} onChange={handleChange} readOnly={isProfileUpdate} disabled={isProfileUpdate} /><p className="text-red-500 text-xs mt-1">{formErrors.email}</p></div>
          {/* Full Name Field */}
          <div><label htmlFor="fullName" className="block text-sm font-medium text-gray-700">Full Name</label><input id="fullName" name="fullName" type="text" autoComplete="name" required className={`mt-1 appearance-none rounded-md relative block w-full px-3 py-2 border ${formErrors.fullName ? 'border-red-500' : 'border-gray-300'} placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`} placeholder="Full name" value={formData.fullName} onChange={handleChange} /><p className="text-red-500 text-xs mt-1">{formErrors.fullName}</p></div>
          {/* Phone Number Field */}
          <div><label htmlFor="phone_number" className="block text-sm font-medium text-gray-700">Phone Number</label><input id="phone_number" name="phone_number" type="tel" autoComplete="tel" required className={`mt-1 appearance-none rounded-md relative block w-full px-3 py-2 border ${formErrors.phone_number ? 'border-red-500' : 'border-gray-300'} placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`} placeholder="Phone number" value={formData.phone_number} onChange={handleChange} /><p className="text-red-500 text-xs mt-1">{formErrors.phone_number}</p></div>
          {/* Date of Birth Field */}
          <div><label htmlFor="date_of_birth" className="block text-sm font-medium text-gray-700">Date of Birth</label><input id="date_of_birth" name="date_of_birth" type="date" required className={`mt-1 appearance-none rounded-md relative block w-full px-3 py-2 border ${formErrors.date_of_birth ? 'border-red-500' : 'border-gray-300'} placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`} value={formData.date_of_birth} onChange={handleChange} /><p className="text-red-500 text-xs mt-1">{formErrors.date_of_birth}</p></div>

          {/* Camera Section */}
          <div className="space-y-2 mb-6"> {/* Reduced space-y for tighter layout */}
            <label className="block text-sm font-medium text-gray-700">
              Profile Photo {isProfileUpdate && <span className="text-red-500">(New Photo Required for Update)</span>}
            </label>
            <div className="flex flex-col items-center space-y-2">
              {showCamera ? (
                <div className="relative w-full max-w-sm">
                  {console.log("RENDER_JSX: Video section rendering (showCamera true).")}
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full rounded-lg border border-gray-300"
                    style={{ transform: 'scaleX(-1)', maxHeight: '300px', backgroundColor: '#111' }} // Slightly reduced maxHeight
                  />
                  <div className="mt-2 flex justify-center gap-2">
                    <button type="button" onClick={capturePhoto} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm">Take Photo</button>
                    <button type="button" onClick={stopCamera} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  {capturedImage ? (
                    <div className="relative inline-block">
                      <img src={capturedImage} alt="Captured Preview" className="w-32 h-32 rounded-full object-cover border-2 border-indigo-400"/> {/* Reduced size for preview */}
                      <button type="button" title="Remove Photo and Open Camera Again" onClick={() => { setCapturedImage(null); setCameraError(null); handleOpenCamera(); }} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={handleOpenCamera} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg>
                      Open Camera
                    </button>
                  )}
                </div>
              )}
              {/* Display profilePhoto validation error */}
              {formErrors.profilePhoto && (
                <p className="mt-1 text-xs text-red-600 text-center">{formErrors.profilePhoto}</p>
              )}
              {/* Display general camera hardware/permission errors */}
              {cameraError && !formErrors.profilePhoto && ( // Avoid showing both if profilePhoto error is active
                <p className="mt-1 text-xs text-red-600 text-center">{cameraError}</p>
              )}
            </div>
          </div>

          {/* Password Fields (conditionally rendered) */}
          {!isProfileUpdate && (
            <>
              <div><label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label><input id="password" name="password" type="password" autoComplete="new-password" required={!isProfileUpdate} className={`mt-1 appearance-none rounded-md relative block w-full px-3 py-2 border ${formErrors.password ? 'border-red-500' : 'border-gray-300'} placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`} placeholder="Password" value={formData.password} onChange={handleChange} /><p className="text-red-500 text-xs mt-1">{formErrors.password}</p></div>
              <div><label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">Confirm Password</label><input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required={!isProfileUpdate} className={`mt-1 appearance-none rounded-md relative block w-full px-3 py-2 border ${formErrors.confirmPassword ? 'border-red-500' : 'border-gray-300'} placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`} placeholder="Confirm password" value={formData.confirmPassword} onChange={handleChange} /><p className="text-red-500 text-xs mt-1">{formErrors.confirmPassword}</p></div>
              <div><label htmlFor="adminSecret" className="block text-sm font-medium text-gray-700">Admin Secret <span className="text-xs text-gray-500">(Optional for new user role)</span></label><input id="adminSecret" name="adminSecret" type="password" autoComplete="off" className={`mt-1 appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`} placeholder="Admin Secret for Registration" value={formData.adminSecret} onChange={handleChange} /><p className="text-red-500 text-xs mt-1">{formErrors.adminSecret}</p></div>
            </>
          )}

          {registerError && ( <div className="rounded-md bg-red-50 p-4 my-3"><div className="flex"><div className="ml-3"><h3 className="text-sm font-medium text-red-800">Error</h3><div className="mt-2 text-sm text-red-700"><p>{registerError}</p></div></div></div></div> )}
          <div><button type="submit" disabled={isSubmitting} className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white ${isSubmitting ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}>{isSubmitting ? (<><span className="absolute left-0 inset-y-0 flex items-center pl-3"><svg className="animate-spin h-5 w-5 text-indigo-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg></span>Processing...</>) : (isProfileUpdate ? 'Update Profile' : 'Create Account')}</button></div>
        </form>
      </div>
    </div>
  );
};

export default Register;