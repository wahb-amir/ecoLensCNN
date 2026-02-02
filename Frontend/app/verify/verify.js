"use client";

import React, { useEffect, useRef, useState } from "react";
import { Leaf, CircleCheck, CircleX } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "../components/Navbar";
import { useRouter, useSearchParams } from "next/navigation";

const Spinner = () => (
  <svg
    className="w-5 h-5 animate-spin"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
  </svg>
);

const OTP_LENGTH = 6;

const getApiUrl = (path) => {
  if (typeof window !== "undefined") {
    const hostIsLocal = window.location.hostname.includes("localhost") || window.location.hostname === "127.0.0.1";
    if (hostIsLocal) {
      // use NEXT_PUBLIC_BACKEND_URL if provided, otherwise call same-origin path
      return `${process.env.NEXT_PUBLIC_BACKEND_URL ?? ""}${path}`;
    } else {
      // production -> assume same origin (adjust if your backend is on a separate domain)
      return path;
    }
  }
  return path;
};

const VerifyPage = () => {
  const router = useRouter();
  const search = useSearchParams();

  // read query params (support reloads / redirects that put email/otp in url)
  const [preEmailParam, setPreEmailParam] = useState("");
  const [preOtpParam, setPreOtpParam] = useState("");

  useEffect(() => {
    setPreEmailParam(search?.get("email") ?? "");
    setPreOtpParam(search?.get("otp") ?? "");
    // only run when search changes
  }, [search]);

  const [email, setEmail] = useState("");
  const [emailLocked, setEmailLocked] = useState(false);
  const [popup, setPopup] = useState({ message: "", type: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingInfo, setIsFetchingInfo] = useState(true);

  // OTP state as array of single chars
  const [otpArr, setOtpArr] = useState(Array(OTP_LENGTH).fill(""));
  const inputsRef = useRef([]);
  const autoSubmitTimerRef = useRef(null);
  const firstRenderRef = useRef(true);

  // Keep email in sync with pre param initially
  useEffect(() => {
    if (preEmailParam) {
      setEmail(preEmailParam);
      setEmailLocked(true);
    }
  }, [preEmailParam]);

  // fetch verification info (server reads verificationToken cookie and decodes)
  useEffect(() => {
    let cancelled = false;
    const fetchInfo = async () => {
      setIsFetchingInfo(true);
      try {
        const res = await fetch(getApiUrl("/verify/info"), {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        if (res.status === 401) {
          // If the server doesn't recognize a verification token BUT the URL has email/otp (redirect flow),
          // don't immediately kick back to /auth — allow the user to continue with the query params.
          if (preEmailParam || preOtpParam) {
            // we don't have server-side info, but allow the page to accept pre-filled params
            if (!cancelled) {
              setIsFetchingInfo(false);
              // if email was provided in query param we set it above; leave page usable
            }
            return;
          } else {
            // otherwise send the user to auth/login
            router.replace("/auth");
            return;
          }
        }

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          if (!cancelled) {
            setPopup({ message: data.message || "Unable to verify. Please login again.", type: "error" });
            setTimeout(() => router.replace("/auth"), 1400);
          }
          return;
        }

        const data = await res.json().catch(() => ({}));
        if (!cancelled) {
          if (data.email) {
            setEmail(data.email);
            setEmailLocked(true); // server-identified email -> lock it
          }
        }
      } catch (err) {
        console.error("verification info error", err);
        if (!cancelled) {
          // if we have query params, allow the user to continue; otherwise redirect to auth
          if (preEmailParam || preOtpParam) {
            setPopup({ message: "Server info not available, using supplied parameters.", type: "error" });
          } else {
            setPopup({ message: "Server error. Redirecting to auth...", type: "error" });
            setTimeout(() => router.replace("/auth"), 1200);
          }
        }
      } finally {
        if (!cancelled) setIsFetchingInfo(false);
      }
    };

    fetchInfo();
    return () => {
      cancelled = true;
      if (autoSubmitTimerRef.current) clearTimeout(autoSubmitTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preEmailParam, preOtpParam]);

  // handle prefilled OTP param (auto-fill + optionally auto-submit)
  useEffect(() => {
    if (!preOtpParam) return;
    const digits = String(preOtpParam).replace(/\D/g, "").slice(0, OTP_LENGTH).split("");
    if (digits.length === 0) return;

    setOtpArr((prev) => {
      const copy = [...prev];
      for (let i = 0; i < OTP_LENGTH; i++) {
        copy[i] = digits[i] ?? "";
      }
      return copy;
    });

    // focus last filled or last input (UX)
    const focusIndex = Math.min(digits.length, OTP_LENGTH - 1);
    setTimeout(() => {
      inputsRef.current[focusIndex]?.focus?.();
    }, 50);

    // auto-submit shortly if full length and email is available or present in param
    autoSubmitTimerRef.current = setTimeout(() => {
      if (digits.length >= OTP_LENGTH) {
        const effectiveEmail = email || preEmailParam || "";
        if (effectiveEmail) {
          // call submit programmatically
          handleVerify(); // guarded inside
        }
      }
    }, 600);

    return () => {
      if (autoSubmitTimerRef.current) clearTimeout(autoSubmitTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preOtpParam, email, preEmailParam]);

  // focus first input after info loaded (if not already auto-filled)
  useEffect(() => {
    if (!isFetchingInfo && firstRenderRef.current) {
      firstRenderRef.current = false;
      // if there is no preOtpParam, focus first input
      if (!preOtpParam) inputsRef.current[0]?.focus?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFetchingInfo]);

  // clear popup automatically
  useEffect(() => {
    if (popup.message) {
      const t = setTimeout(() => setPopup({ message: "", type: "" }), 3500);
      return () => clearTimeout(t);
    }
  }, [popup.message]);

  // helpers
  const setOtpChar = (index, val) => {
    // accept only digits; val may contain multiple chars (paste from mobile)
    const digits = String(val).replace(/\D/g, "");
    if (digits.length === 0) {
      setOtpArr((prev) => {
        const copy = [...prev];
        copy[index] = "";
        return copy;
      });
      return;
    }

    // If multiple digits provided, distribute starting at index
    setOtpArr((prev) => {
      const copy = [...prev];
      let pos = index;
      for (let ch of digits) {
        if (pos >= OTP_LENGTH) break;
        copy[pos] = ch;
        pos++;
      }
      return copy;
    });

    // move focus to next empty position (after the last inserted)
    const nextPos = Math.min(index + digits.length, OTP_LENGTH - 1);
    setTimeout(() => {
      inputsRef.current[nextPos]?.focus?.();
      // if we filled all inputs, attempt auto-submit
      const currentOtp = inputsRef.current.map((inp) => inp?.value ?? "").join("");
      const stateOtp = (currentOtp || otpArr.join("")).replace(/\D/g, "");
      if (stateOtp.length >= OTP_LENGTH) {
        // slight delay so state settles
        setTimeout(() => {
          handleVerify();
        }, 120);
      }
    }, 20);
  };

  const handleKeyDown = (e, idx) => {
    const key = e.key;
    if (key === "Backspace") {
      e.preventDefault();
      if (otpArr[idx]) {
        // clear current
        setOtpChar(idx, "");
      } else {
        // move to previous and clear it
        const prev = idx - 1;
        if (prev >= 0) {
          setOtpArr((prevArr) => {
            const copy = [...prevArr];
            copy[prev] = "";
            return copy;
          });
          inputsRef.current[prev]?.focus();
        }
      }
      return;
    }

    if (key === "ArrowLeft") {
      const prev = idx - 1;
      if (prev >= 0) inputsRef.current[prev]?.focus();
      return;
    }
    if (key === "ArrowRight") {
      const next = idx + 1;
      if (next < OTP_LENGTH) inputsRef.current[next]?.focus();
      return;
    }
    // prevent non-numeric for single-character keys
    if (!/^\d$/.test(key) && key.length === 1) {
      e.preventDefault();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const paste = (e.clipboardData || window["clipboardData"]).getData("text");
    const digits = paste.replace(/\D/g, "").slice(0, OTP_LENGTH).split("");
    if (digits.length === 0) return;

    // find currently focused index (or 0)
    const activeIndex = inputsRef.current.findIndex((el) => el === document.activeElement);
    const startIndex = activeIndex >= 0 ? activeIndex : 0;

    setOtpArr((prev) => {
      const copy = [...prev];
      let pos = startIndex;
      for (let d of digits) {
        if (pos >= OTP_LENGTH) break;
        copy[pos] = d;
        pos++;
      }
      return copy;
    });

    const finalFocus = Math.min(startIndex + digits.length - 1, OTP_LENGTH - 1);
    setTimeout(() => {
      inputsRef.current[finalFocus]?.focus?.();
      // auto-submit if full
      const filledOtp = (() => {
        const cur = inputsRef.current.map((i, iidx) => {
          if (i) return i.value || otpArr[iidx] || "";
          return otpArr[iidx] || "";
        }).join("");
        return cur.replace(/\D/g, "");
      })();
      if (filledOtp.length >= OTP_LENGTH) {
        setTimeout(() => handleVerify(), 120);
      }
    }, 30);
  };

  const otpValue = otpArr.join("");

  const handleVerify = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (isLoading) return;

    const otpDigits = otpArr.join("").replace(/\D/g, "");
    if (otpDigits.length !== OTP_LENGTH) {
      setPopup({ message: "Please enter the full OTP.", type: "error" });
      return;
    }

    const effectiveEmail = email || preEmailParam || "";
    if (!effectiveEmail) {
      setPopup({ message: "Email missing. Please return to login.", type: "error" });
      setTimeout(() => router.replace("/auth"), 1000);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(getApiUrl("/verify"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: effectiveEmail.trim(), otp: otpDigits }),
        credentials: "include",
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPopup({ message: data.msg || data.message || "Verification failed", type: "error" });
      } else {
        setPopup({ message: data.message || "Verified successfully", type: "success" });
       
        setTimeout(() => router.push("/dashboard"), 700);
      }
    } catch (err) {
      console.error(err);
      setPopup({ message: "Server error. Try again later.", type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (isLoading) return;
    const effectiveEmail = email || preEmailParam || "";
    if (!effectiveEmail) {
      setPopup({ message: "Email missing.", type: "error" });
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(getApiUrl("/api/resend-otp"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: effectiveEmail.trim() }),
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setPopup({ message: data.msg || data.message || "Resend failed", type: "error" });
      else {
        setPopup({ message: data.message || "OTP resent", type: "success" });
        setOtpArr(Array(OTP_LENGTH).fill(""));
        setTimeout(() => inputsRef.current[0]?.focus(), 50);
      }
    } catch (err) {
      console.error(err);
      setPopup({ message: "Server error. Try again later.", type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  // cleanup refs on unmount
  useEffect(() => {
    return () => {
      inputsRef.current = [];
    };
  }, []);

  return (
    <>
      <Navbar />
      <section className="pt-[80px] mt-11">
        <div className="flex items-center justify-center bg-gray-50 px-4">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="w-full max-w-md bg-white border border-green-600 rounded-xl p-6 shadow-lg"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.12, duration: 0.45 }}
              className="flex flex-col items-center mb-4"
            >
              <Leaf className="w-10 h-10 text-green-600 mb-2 animate-bounce" />
              <h1 className="text-2xl font-semibold text-gray-800">Verify your account</h1>
              <p className="text-sm text-gray-500 mt-1 text-center">
                Enter the OTP sent to your email to complete registration.
              </p>
            </motion.div>

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
                    {popup.type === "success" ? <CircleCheck size={18} /> : <CircleX size={18} />}
                    <span className="break-words">{popup.message}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <form onSubmit={handleVerify} className="flex flex-col gap-4">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => {
                  if (!emailLocked) setEmail(e.target.value);
                }}
                readOnly={emailLocked}
                className={`w-full px-4 py-2 border rounded-md focus:outline-none ${
                  emailLocked ? "bg-gray-100 border-gray-200 cursor-not-allowed" : "border-gray-300 focus:border-green-500"
                }`}
                required
                aria-label="Email"
              />

              {/* segmented OTP UI */}
              <div className="mb-2">
                {isFetchingInfo ? (
                  <div className="py-8 flex justify-center">
                    <Spinner />
                  </div>
                ) : (
                  <div
                    className="flex justify-center items-center gap-2 mt-1"
                    onPaste={handlePaste}
                    role="group"
                    aria-label={`Enter ${OTP_LENGTH}-digit verification code`}
                  >
                    {Array.from({ length: OTP_LENGTH }).map((_, idx) => (
                      <input
                        key={idx}
                        ref={(el) => {
                          if (el) inputsRef.current[idx] = el;
                        }}
                        inputMode="numeric"
                        pattern="\d*"
                        maxLength={OTP_LENGTH} // allow multi-char paste distribution
                        value={otpArr[idx]}
                        onChange={(e) => setOtpChar(idx, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, idx)}
                        className="w-12 h-14 text-center text-lg font-medium border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 transition shadow-sm"
                        aria-label={`Digit ${idx + 1}`}
                        aria-invalid={false}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isLoading || isFetchingInfo}
                  className={`flex items-center justify-center gap-2 flex-1 py-2 rounded-md text-white ${
                    isLoading || isFetchingInfo ? "bg-green-300 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"
                  }`}
                >
                  {isLoading ? <Spinner /> : null}
                  <span>{isLoading ? "Verifying..." : "Verify"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleResend}
                  disabled={isLoading || isFetchingInfo}
                  className={`py-2 px-3 rounded-md border border-green-600 text-green-600 ${
                    isLoading || isFetchingInfo ? "opacity-50 cursor-not-allowed" : "hover:bg-green-50"
                  }`}
                >
                  Resend
                </button>
              </div>
            </form>

            <motion.div className="text-center mt-6 text-sm text-gray-600">
              <button onClick={() => router.push("/auth")} className="text-green-600 font-medium hover:underline">
                Back to auth
              </button>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </>
  );
};

export default VerifyPage;
