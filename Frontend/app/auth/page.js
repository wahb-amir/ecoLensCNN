"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Leaf, CircleCheck, CircleX } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "../components/Navbar";
import { useRouter } from "next/navigation";

const MIN_PASSWORD_LENGTH = 8;

const emailRegex =
  /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@(([^<>()[\]\.,;:\s@"]+\.)+[^<>()[\]\.,;:\s@"]{2,})$/i;

const Spinner = () => (
  <svg
    className="w-5 h-5 animate-spin"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
    />
  </svg>
);

const getApiUrl = (path) => {
  if (typeof window !== "undefined") {
    if (window.location.hostname === "localhost") {
      return `${process.env.NEXT_PUBLIC_BACKEND_URL ?? ""}${path}`;
    } else {
      return path;
    }
  }
  return path;
};

const AuthPage = () => {
  const router = useRouter();

  const [isLogin, setIsLogin] = useState(true);
  const [popup, setPopup] = useState({ message: "", type: "" }); // type: 'success' | 'error' | ''

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // clear popup after some time
    if (popup.message) {
      const t = setTimeout(() => setPopup({ message: "", type: "" }), 3000);
      return () => clearTimeout(t);
    }
  }, [popup.message]);

  // real-time validation
  useEffect(() => {
    const newErrors = {};
    if (!isLogin) {
      if (!name.trim()) newErrors.name = "Full name is required.";
      else if (name.trim().length < 2) newErrors.name = "Name is too short.";
    }
    if (!email.trim()) newErrors.email = "Email is required.";
    else if (!emailRegex.test(email))
      newErrors.email = "Invalid email address.";

    if (!password) newErrors.password = "Password is required.";
    else if (password.length < MIN_PASSWORD_LENGTH)
      newErrors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;

    setErrors(newErrors);
  }, [name, email, password, isLogin]);

  const isFormValid = useMemo(() => {
    // valid when no errors and required fields are present
    if (isLogin) {
      return Object.keys(errors).length === 0 && email && password;
    } else {
      return Object.keys(errors).length === 0 && name && email && password;
    }
  }, [errors, isLogin, name, email, password]);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!isFormValid || isLoading) return;

    setIsLoading(true);

    if (isLogin) {
      // Login flow
      try {
        const res = await fetch(getApiUrl("/api/login"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim(), password }),
          credentials: "include",
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setPopup({
            message: data.message || data.error || "Login failed",
            type: "error",
          });
        } else {
          setPopup({
            message: data.message || "Login successful",
            type: "success",
          });
          if(data.redirectTo)
            router.push(data.redirectTo);
        }
      } catch (err) {
        console.error(err);
        setPopup({ message: "Server error. Try again later.", type: "error" });
      } finally {
        setIsLoading(false);
      }
    } else {
      // Signup flow
      try {
        const res = await fetch(getApiUrl("/api/register"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim(),
            password,
          }),
          credentials: "include",
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setPopup({
            message: data.msg || data.message || "Signup failed",
            type: "error",
          });
          setIsLoading(false);
        } else {
          // Show success and redirect to verification page
          setPopup({
            message: "Account created. Redirecting to verification...",
            type: "success",
          });

          // keep loading spinner visible briefly then redirect
          setTimeout(() => {
            // include email in query so verify page can prefill (not a secret)
            const href = `/verify?email=${encodeURIComponent(email.trim())}`;
            router.push(href);
          }, 700);
        }
      } catch (err) {
        console.error(err);
        setPopup({ message: "Server error. Try again later.", type: "error" });
        setIsLoading(false);
      }
    }
  };

  return (
    <>
      <Navbar />
      <section className="pt-[80px] mt-11">
        <div className="flex items-center justify-center bg-gray-50 px-4">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="w-full max-w-md bg-white border border-green-600 rounded-lg p-6 shadow-sm"
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="flex flex-col items-center mb-4"
            >
              <Leaf className="w-10 h-10 text-green-600 mb-2 animate-bounce" />
              <h1 className="text-2xl font-semibold text-gray-800 text-center">
                {isLogin ? "Login to EcoTracker" : "Create your account"}
              </h1>
              <p className="text-sm text-gray-500 mt-1 text-center">
                Track your impact. Live greener.
              </p>
            </motion.div>

            {/* popup container with reserved height to prevent layout shift */}
            <div className="mb-4 min-h-[46px]">
              <AnimatePresence>
                {popup.message && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.22 }}
                    className={`w-full px-4 py-3 rounded-md flex items-center gap-2 text-sm ${
                      popup.type === "success"
                        ? "bg-green-50 border border-green-300 text-green-700"
                        : "bg-red-50 border border-red-300 text-red-700"
                    }`}
                  >
                    {popup.type === "success" ? (
                      <CircleCheck size={18} />
                    ) : (
                      <CircleX size={18} />
                    )}
                    <span className="break-words">{popup.message}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <motion.form
              onSubmit={handleSubmit}
              layout
              className="flex flex-col gap-4"
            >
              {!isLogin && (
                <div>
                  <motion.input
                    type="text"
                    placeholder="Full Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={`w-full px-4 py-2 border rounded-md focus:outline-none ${
                      errors.name
                        ? "border-red-400 focus:border-red-500"
                        : "border-gray-300 focus:border-green-500"
                    }`}
                    aria-invalid={!!errors.name}
                    aria-describedby={errors.name ? "name-error" : undefined}
                  />
                  {errors.name && (
                    <p id="name-error" className="mt-1 text-xs text-red-600">
                      {errors.name}
                    </p>
                  )}
                </div>
              )}

              <div>
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full px-4 py-2 border rounded-md focus:outline-none ${
                    errors.email
                      ? "border-red-400 focus:border-red-500"
                      : "border-gray-300 focus:border-green-500"
                  }`}
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? "email-error" : undefined}
                />
                {errors.email && (
                  <p id="email-error" className="mt-1 text-xs text-red-600">
                    {errors.email}
                  </p>
                )}
              </div>

              <div>
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full px-4 py-2 border rounded-md focus:outline-none ${
                    errors.password
                      ? "border-red-400 focus:border-red-500"
                      : "border-gray-300 focus:border-green-500"
                  }`}
                  aria-invalid={!!errors.password}
                  aria-describedby={
                    errors.password ? "password-error" : undefined
                  }
                />
                {errors.password && (
                  <p id="password-error" className="mt-1 text-xs text-red-600">
                    {errors.password}
                  </p>
                )}
              </div>

              <motion.button
                type="submit"
                whileHover={{ scale: isFormValid && !isLoading ? 1.03 : 1 }}
                whileTap={{ scale: isFormValid && !isLoading ? 0.97 : 1 }}
                disabled={!isFormValid || isLoading}
                aria-busy={isLoading}
                className={`mt-2 flex items-center justify-center gap-2 w-full text-white py-2 rounded-md transition ${
                  !isFormValid || isLoading
                    ? "bg-green-300 cursor-not-allowed"
                    : "bg-green-600 hover:bg-green-700"
                }`}
              >
                {isLoading ? <Spinner /> : null}
                <span>
                  {isLogin
                    ? isLoading
                      ? "Logging in..."
                      : "Login"
                    : isLoading
                      ? "Signing up..."
                      : "Sign Up"}
                </span>
              </motion.button>
            </motion.form>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-center mt-6 text-sm text-gray-600"
            >
              {isLogin ? (
                <>
                  Don’t have an account?{" "}
                  <button
                    onClick={() => {
                      setIsLogin(false);
                      setPopup({ message: "", type: "" });
                    }}
                    className="text-green-600 font-medium hover:underline"
                  >
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    onClick={() => {
                      setIsLogin(true);
                      setPopup({ message: "", type: "" });
                    }}
                    className="text-green-600 font-medium hover:underline"
                  >
                    Login
                  </button>
                </>
              )}
            </motion.div>
          </motion.div>
        </div>
      </section>
    </>
  );
};

export default AuthPage;
