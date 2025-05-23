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
  const [isStartingCamera, setIsStartingCamera] = useState(false); // New state for camera starting process
  const [capturedImage, setCapturedImage] = useState(null);
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
        password: '', confirmPassword: '', adminSecret: formData.adminSecret // Keep adminSecret if already typed
      });
    } else if (email && !isProfileUpdate) {
      setFormData(prev => ({ ...prev, email }));
    }
  }, [isProfileUpdate, userData, email]); // Removed formData.adminSecret from deps

  // Redirect if already authenticated and not updating profile
  useEffect(() => {
    if (isAuthenticated && !isProfileUpdate) {
      navigate('/');
    }
  }, [isAuthenticated, navigate, isProfileUpdate]);

  // Effect for attaching/detaching video element event listeners
  useEffect(() => {
    const videoElement = videoRef.current;

    if (showCamera && videoElement) { // Only attach if video element should be visible and ref exists
      console.log("VIDEO_EVENT_EFFECT: Attaching event listeners to video element.");

      const handleLoadedMetadata = () => {
        console.log("VIDEO_EVENT: onloadedmetadata fired.");
        console.log("VIDEO_METADATA: Dimensions - Width:", videoElement.videoWidth, "Height:", videoElement.videoHeight);
        if (videoElement.paused) {
          videoElement.play().then(() => {
            console.log("VIDEO_PLAY: play() successful from onloadedmetadata.");
          }).catch(err => {
            console.error("VIDEO_PLAY_ERROR: play() failed from onloadedmetadata:", err);
            setCameraError(`Error playing video: ${err.message}. Autoplay might be blocked.`);
          });
        }
      };
      const handlePlaying = () => {
        console.log("VIDEO_EVENT: onplaying fired. Video feed should be active.");
        setCameraError(null);
      };
      const handleError = (e) => {
        console.error("VIDEO_ELEMENT_ERROR:", e);
        let errorMsg = "Video player error.";
        if (videoElement.error) {
          console.error("VIDEO_ELEMENT_ERROR details: Code:", videoElement.error.code, "Message:", videoElement.error.message);
          errorMsg = `Video error: ${videoElement.error.message} (Code: ${videoElement.error.code})`;
        }
        setCameraError(errorMsg);
      };
      const handleCanPlay = () => console.log("VIDEO_EVENT: oncanplay fired.");
      const handleWaiting = () => console.warn("VIDEO_EVENT: onwaiting - waiting for data.");
      const handleStalled = () => console.warn("VIDEO_EVENT: onstalled - data fetching stalled.");

      videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);
      videoElement.addEventListener('playing', handlePlaying);
      videoElement.addEventListener('error', handleError);
      videoElement.addEventListener('canplay', handleCanPlay);
      videoElement.addEventListener('waiting', handleWaiting);
      videoElement.addEventListener('stalled', handleStalled);

      return () => {
        console.log("VIDEO_EVENT_EFFECT: Cleaning up video event listeners.");
        videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
        videoElement.removeEventListener('playing', handlePlaying);
        videoElement.removeEventListener('error', handleError);
        videoElement.removeEventListener('canplay', handleCanPlay);
        videoElement.removeEventListener('waiting', handleWaiting);
        videoElement.removeEventListener('stalled', handleStalled);
      };
    }
  }, [showCamera]); // Re-run when showCamera changes, videoRef.current implicitly checked by `if`

  // useEffect to start the camera stream AFTER the video element is rendered and isStartingCamera is true
  useEffect(() => {
    const startStream = async () => {
      // Only proceed if we intend to start, the video element is ready, and no stream already exists
      if (isStartingCamera && videoRef.current && !streamRef.current) {
        console.log("EFFECT_START_STREAM: videoRef is available, now attempting to get stream.");
        setCameraError(null);

        // Stop any previous stream that might have been left due to an error
        if (streamRef.current) {
            console.log("EFFECT_START_STREAM: Cleaning up a lingering streamRef before starting new one.");
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (videoRef.current.srcObject) {
            console.log("EFFECT_START_STREAM: Cleaning up lingering srcObject from videoRef.");
            (videoRef.current.srcObject).getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }


        try {
          const constraints = {
            video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
            audio: false
          };
          console.log("EFFECT_START_STREAM: Requesting media with constraints:", constraints);

          const newStream = await navigator.mediaDevices.getUserMedia(constraints);
          console.log("EFFECT_START_STREAM: Media stream obtained successfully:", newStream);
          streamRef.current = newStream;

          if (videoRef.current) { // Double check ref, though the effect dependency should ensure it
            videoRef.current.srcObject = newStream;
            console.log("EFFECT_START_STREAM: srcObject assigned to video element.");
            // autoPlay and onloadedmetadata listener should handle playback
          } else {
            console.error("EFFECT_START_STREAM_ERROR: videoRef.current became null unexpectedly after stream acquisition.");
            newStream.getTracks().forEach(track => track.stop()); // Clean up the newly acquired stream
            streamRef.current = null;
            setIsStartingCamera(false); // Reset state
            setShowCamera(false);
          }
        } catch (err) {
          console.error('EFFECT_START_STREAM_ERROR: getUserMedia failed:', err.name, err.message, err);
          let userMessage = "Could not access camera.";
          if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") userMessage = "No camera found. Ensure it's connected and enabled.";
          else if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") userMessage = "Camera permission denied. Please allow access in browser/OS settings.";
          else if (err.name === "NotReadableError" || err.name === "TrackStartError") userMessage = "Camera is in use or a hardware error occurred. Close other apps or restart.";
          else if (err.name === "OverconstrainedError" || err.name === "ConstraintNotSatisfiedError") userMessage = `Camera doesn't support requested settings: ${err.message}`;
          else if (err.name === "AbortError") userMessage = "Camera access aborted.";
          else if (err.name === "SecurityError") userMessage = "Camera access blocked (HTTPS required or security setting).";
          else userMessage = `Camera error: ${err.name}. Check console for details.`;
          setCameraError(userMessage);
          setShowCamera(false);
          setIsStartingCamera(false); // Reset starting state
          if (streamRef.current) { // Clean up if stream was somehow partially acquired
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
          }
        }
      } else if (isStartingCamera && !videoRef.current) {
          console.warn("EFFECT_START_STREAM: isStartingCamera is true, but videoRef.current is still null. Waiting for ref.");
      } else if (isStartingCamera && streamRef.current) {
          console.log("EFFECT_START_STREAM: isStartingCamera is true, but streamRef.current already exists. Stream is likely already active or being set up.");
      }
    };

    startStream();

  }, [isStartingCamera, videoRef.current]); // React to changes in these dependencies

  // Cleanup effect for component unmount
  useEffect(() => {
    return () => {
      console.log("COMPONENT_UNMOUNT: Attempting to stop camera stream if active.");
      if (streamRef.current) {
        console.log("COMPONENT_UNMOUNT: streamRef found, stopping tracks.");
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current && videoRef.current.srcObject) {
         videoRef.current.srcObject = null;
      }
    };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateForm = () => { /* ... your existing validateForm ... */ 
    const errors = {};
    if (!formData.fullName.trim()) errors.fullName = 'Full name is required';
    else if (formData.fullName.length < 2) errors.fullName = 'Full name must be at least 2 characters';
    if (!formData.phone_number?.trim()) errors.phone_number = 'Phone number is required';
    else if (!/^\d{10,15}$/.test(formData.phone_number.replace(/[^0-9]/g, ''))) errors.phone_number = 'Phone number must be 10-15 digits';
    if (!formData.date_of_birth) errors.date_of_birth = 'Date of birth is required';
    if (!isProfileUpdate) {
      if (!formData.email.trim()) errors.email = 'Email is required';
      else if (!/\S+@\S+\.\S+/.test(formData.email)) errors.email = 'Email is invalid';
      if (!formData.password) errors.password = 'Password is required';
      else if (formData.password.length < 6) errors.password = 'Password must be at least 6 characters';
      if (formData.password !== formData.confirmPassword) errors.confirmPassword = 'Passwords do not match';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Button handler to initiate camera start
  const handleOpenCamera = () => {
    console.log("HANDLE_OPEN_CAMERA: Clicked.");
    // Stop any existing stream before trying to start a new one
    if (streamRef.current) {
        console.log("HANDLE_OPEN_CAMERA: Existing stream found, stopping it first.");
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
        (videoRef.current.srcObject).getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
    }

    setCameraError(null);
    setCapturedImage(null);
    setShowCamera(true);        // 1. Render the video element UI
    setIsStartingCamera(true);  // 2. Trigger the useEffect to get the stream
  };

  const stopCamera = () => {
    console.log("STOP_CAMERA: User clicked cancel/stop.");
    setShowCamera(false);       // Hide UI
    setIsStartingCamera(false); // Stop any attempts to start

    if (streamRef.current) {
      console.log("STOP_CAMERA: streamRef found, stopping tracks.");
      streamRef.current.getTracks().forEach(track => {
        console.log(`STOP_CAMERA: Stopping track - ID: ${track.id}, Label: ${track.label}, Kind: ${track.kind}, ReadyState: ${track.readyState}`);
        track.stop();
        console.log(`STOP_CAMERA: Track stopped. New ReadyState: ${track.readyState}`);
      });
      streamRef.current = null;
      console.log("STOP_CAMERA: streamRef set to null.");
    } else {
      console.log("STOP_CAMERA: No active stream (streamRef.current is null).");
    }

    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject = null;
      videoRef.current.load(); // Important to reset video element state
      console.log("STOP_CAMERA: videoRef.current.srcObject set to null and loaded.");
    } else {
      console.log("STOP_CAMERA: videoRef.current.srcObject was already null or videoRef.current is null.");
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && videoRef.current.srcObject && videoRef.current.readyState >= videoRef.current.HAVE_CURRENT_DATA && videoRef.current.videoWidth > 0) {
      console.log("CAPTURE_PHOTO: Attempting to capture photo.");
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');

      // Mirror the capture if the video preview is mirrored
      if (videoRef.current.style.transform === 'scaleX(-1)') {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const imageData = canvas.toDataURL('image/jpeg');
      setCapturedImage(imageData);
      console.log("CAPTURE_PHOTO: Photo captured.");
      stopCamera(); // Stop camera after capture
    } else {
      console.warn("CAPTURE_PHOTO_WARN: Cannot capture photo, video data not available, video not ready, or video width is 0.");
      setCameraError("Cannot capture photo, camera feed not ready or has zero dimensions.");
    }
  };

  const handleSubmit = async (e) => { /* ... your existing handleSubmit logic ... */ 
      e.preventDefault();
      if (validateForm()) {
        setIsSubmitting(true);
        setRegisterError('');
        try {
          let dataPayload;
          // Add capturedImage (as base64) to the payload if it exists
          const image_to_send = capturedImage; // Or convert to File object if backend prefers

          if (isProfileUpdate) {
            let formattedDate = formData.date_of_birth;
            if (formData.date_of_birth && typeof formData.date_of_birth === 'string') {
              formattedDate = formData.date_of_birth.split('T')[0];
            }
            dataPayload = {
              full_name: formData.fullName, phone_number: formData.phone_number,
              date_of_birth: formattedDate,
              ...(image_to_send && { profile_image_base64: image_to_send })
            };
            console.log('Updating profile with data:', dataPayload);
            const token = localStorage.getItem('token');
            if (!token) {
              setRegisterError('Authentication required.'); setIsSubmitting(false); return;
            }
            // Axios/Fetch for PATCH
            try {
              const response = await axios.patch( `https://openmindsbackend.onrender.com/api/auth/users/${userId}`, dataPayload, { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } });
              setRegisterSuccess(true); setSuccessMessage('Profile updated! Redirecting...');
              setTimeout(() => navigate('/'), 2000);
            } catch (axiosError) {
                // Fallback to fetch or specific error handling
                console.error("Axios PATCH error:", axiosError.response?.data || axiosError.message);
                setRegisterError(axiosError.response?.data?.message || 'Update failed via Axios.');
            }

          } else { // Registration
            const { confirmPassword, ...restData } = formData;
            dataPayload = {
              full_name: restData.fullName, email: restData.email, password: restData.password,
              phone_number: restData.phone_number, date_of_birth: restData.date_of_birth,
              ...(image_to_send && { profile_image_base64: image_to_send })
            };
            if (restData.adminSecret) dataPayload.admin_secret = restData.adminSecret;
            console.log('Registering with data:', dataPayload);
            // Axios/Fetch for POST
            try {
                const response = await axios.post('https://openmindsbackend.onrender.com/api/auth/register', dataPayload, { headers: { 'Content-Type': 'application/json' } });
                setRegisterSuccess(true); setSuccessMessage('Registered! Redirecting to login...');
                setTimeout(() => navigate('/login'), 2000);
            } catch (axiosError) {
                console.error("Axios POST error:", axiosError.response?.data || axiosError.message);
                setRegisterError(axiosError.response?.data?.message || 'Registration failed.');
            }
          }
        } catch (err) {
          console.error('Overall submit error:', err);
          setRegisterError('An unexpected error occurred.');
        } finally {
          setIsSubmitting(false);
        }
      }
  };

  if (registerSuccess) { /* ... your existing success JSX ... */ 
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
          <div className="space-y-4 mb-6">
            <label className="block text-sm font-medium text-gray-700">Profile Photo</label>
            <div className="flex flex-col items-center space-y-4">
              {showCamera ? (
                <div className="relative w-full max-w-sm">
                  {console.log("RENDER_JSX: Video section rendering because showCamera is true.")}
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full rounded-lg border border-gray-300"
                    style={{ transform: 'scaleX(-1)', maxHeight: '400px', backgroundColor: '#111' }}
                  />
                  <div className="mt-2 flex justify-center gap-2">
                    <button type="button" onClick={capturePhoto} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">Take Photo</button>
                    <button type="button" onClick={stopCamera} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  {capturedImage ? (
                    <div className="relative inline-block">
                      <img src={capturedImage} alt="Captured" className="w-48 h-48 rounded-full object-cover border-4 border-indigo-500" />
                      <button type="button" onClick={() => { setCapturedImage(null); setCameraError(null); }} className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 hover:bg-red-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={handleOpenCamera} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg>
                      Open Camera
                    </button>
                  )}
                  {cameraError && <p className="mt-2 text-sm text-red-600">{cameraError}</p>}
                </div>
              )}
            </div>
          </div>

          {/* Password Fields (conditionally rendered) */}
          {!isProfileUpdate && (
            <>
              <div><label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label><input id="password" name="password" type="password" autoComplete="new-password" required={!isProfileUpdate} className={`mt-1 appearance-none rounded-md relative block w-full px-3 py-2 border ${formErrors.password ? 'border-red-500' : 'border-gray-300'} placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`} placeholder="Password" value={formData.password} onChange={handleChange} /><p className="text-red-500 text-xs mt-1">{formErrors.password}</p></div>
              <div><label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">Confirm Password</label><input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required={!isProfileUpdate} className={`mt-1 appearance-none rounded-md relative block w-full px-3 py-2 border ${formErrors.confirmPassword ? 'border-red-500' : 'border-gray-300'} placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`} placeholder="Confirm password" value={formData.confirmPassword} onChange={handleChange} /><p className="text-red-500 text-xs mt-1">{formErrors.confirmPassword}</p></div>
              <div><label htmlFor="adminSecret" className="block text-sm font-medium text-gray-700">Admin Secret</label><input id="adminSecret" name="adminSecret" type="password" autoComplete="off" className={`mt-1 appearance-none rounded-md relative block w-full px-3 py-2 border ${formErrors.adminSecret ? 'border-red-500' : 'border-gray-300'} placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`} placeholder="Admin Secret for Registration" value={formData.adminSecret} onChange={handleChange} /><p className="text-red-500 text-xs mt-1">{formErrors.adminSecret}</p></div>
            </>
          )}

          {/* Submission Error Display */}
          {registerError && (
            <div className="rounded-md bg-red-50 p-4"><div className="flex"><div className="ml-3"><h3 className="text-sm font-medium text-red-800">Error</h3><div className="mt-2 text-sm text-red-700"><p>{registerError}</p></div></div></div></div>
          )}

          {/* Submit Button */}
          <div><button type="submit" disabled={isSubmitting} className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white ${isSubmitting ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}>{isSubmitting ? (<><span className="absolute left-0 inset-y-0 flex items-center pl-3"><svg className="animate-spin h-5 w-5 text-indigo-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg></span>Processing...</>) : (isProfileUpdate ? 'Update Profile' : 'Create Account')}</button></div>
        </form>
      </div>
    </div>
  );
};

export default Register;