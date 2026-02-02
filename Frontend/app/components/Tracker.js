"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

const DAY_MS = 24 * 60 * 60 * 1000;

const TRANSPORT_CO2 = {
  bike: 0,
  walk: 0,
  public: 2,
  car: 8,
};

const ELECTRICITY_CO2 = {
  low: 2,
  medium: 5,
  high: 10,
};

const PLASTIC_CO2 = {
  low: 1,
  medium: 3,
  high: 6,
};

const getWeekKey = () => {
  const now = new Date();
  const firstDayOfYear = new Date(now.getFullYear(), 0, 1);
  const pastDays = Math.floor((now - firstDayOfYear) / DAY_MS);
  return `${now.getFullYear()}-W${Math.ceil(
    (pastDays + firstDayOfYear.getDay() + 1) / 7
  )}`;
};

const Tracker = () => {
  const [formData, setFormData] = useState({
    transport: "",
    electricity: "",
    plastic: "",
  });

  const [entries, setEntries] = useState([]);
  const [lastSubmit, setLastSubmit] = useState(null);
  const [canSubmit, setCanSubmit] = useState(true);
  const [timeLeft, setTimeLeft] = useState(null);
  const [weekKey, setWeekKey] = useState(getWeekKey());

  useEffect(() => {
    const currentWeek = getWeekKey();
    if (currentWeek !== weekKey) {
      setEntries([]);
      setWeekKey(currentWeek);
      setLastSubmit(null);
      setCanSubmit(true);
      setTimeLeft(null);
    }
  }, [weekKey]);

  useEffect(() => {
    if (!lastSubmit) return;
    const diff = Date.now() - lastSubmit;
    if (diff < DAY_MS) {
      setCanSubmit(false);
      setTimeLeft(DAY_MS - diff);
    }
  }, [lastSubmit]);

  useEffect(() => {
    if (!canSubmit && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((t) => t - 1000);
      }, 1000);
      return () => clearInterval(timer);
    }
    if (timeLeft <= 0 && timeLeft !== null) {
      setCanSubmit(true);
      setTimeLeft(null);
    }
  }, [timeLeft, canSubmit]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const calculateImpact = () => {
    const totalCO2 =
      (TRANSPORT_CO2[formData.transport] || 0) +
      (ELECTRICITY_CO2[formData.electricity] || 0) +
      (PLASTIC_CO2[formData.plastic] || 0);

    return {
      totalCO2,
      ecoScore: Math.max(0, 100 - totalCO2 * 3),
    };
  };

  const handleSubmit = () => {
    if (!formData.transport || !formData.electricity || !formData.plastic)
      return;

    const impact = calculateImpact();

    const entry = {
      ...formData,
      ...impact,
      date: new Date().toLocaleDateString(),
      timestamp: Date.now(),
    };

    setEntries((prev) => [...prev, entry].slice(-7));
    setLastSubmit(Date.now());
    setCanSubmit(false);
    setTimeLeft(DAY_MS);
    setFormData({ transport: "", electricity: "", plastic: "" });
  };

  const formatTime = (ms) => {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${h}h ${m}m ${s}s`;
  };

  return (
    <section className="bg-gradient-to-b from-green-50 to-white py-16 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl font-bold text-green-600">
            Weekly Eco Impact Tracker
          </h2>
          <p className="mt-3 text-gray-600">
            One eco log per day. Fresh start every week.
          </p>
        </motion.div>

        <div className="bg-white rounded-2xl shadow-xl p-6 mb-12">
          <h3 className="text-xl font-semibold text-emerald-600 mb-4">
            🌱 Today’s Entry
          </h3>

          {!canSubmit && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center">
              <p className="text-green-700 font-medium">
                You’ve already logged today 🌍
              </p>
              <p className="text-sm text-gray-600 mt-2">
                Next entry available in
              </p>
              <p className="text-lg font-semibold text-emerald-700 mt-1">
                {formatTime(timeLeft)}
              </p>
            </div>
          )}

          {canSubmit && (
            <>
              <div className="grid md:grid-cols-3 gap-4">
                <select
                  name="transport"
                  value={formData.transport}
                  onChange={handleChange}
                  className="border rounded-lg px-4 py-2"
                >
                  <option value="">Transport</option>
                  <option value="walk">Walk</option>
                  <option value="bike">Bike</option>
                  <option value="public">Public Transport</option>
                  <option value="car">Car</option>
                </select>

                <select
                  name="electricity"
                  value={formData.electricity}
                  onChange={handleChange}
                  className="border rounded-lg px-4 py-2"
                >
                  <option value="">Electricity</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>

                <select
                  name="plastic"
                  value={formData.plastic}
                  onChange={handleChange}
                  className="border rounded-lg px-4 py-2"
                >
                  <option value="">Plastic</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <button
                onClick={handleSubmit}
                className="mt-6 w-full bg-green-600 text-white py-2 rounded-xl hover:bg-green-700 
                transition-all duration-300 cursor-pointer"
              >
                Submit Today
              </button>
            </>
          )}
        </div>

        <div>
          <h3 className="text-xl font-semibold text-gray-800 mb-6">
            📊 Current Week Overview
          </h3>

          {entries.length === 0 ? (
            <p className="text-gray-500">No entries yet.</p>
          ) : (
            <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {entries.map((e, i) => (
                <motion.div
                  key={i}
                  whileHover={{ scale: 1.03 }}
                  className="bg-gradient-to-br from-white to-emerald-50 rounded-2xl border border-emerald-100 p-5 shadow-sm"
                >
                  <p className="text-xs text-gray-500 mb-2">{e.date}</p>
                  <div className="space-y-1 text-sm">
                    <p>🚶 {e.transport}</p>
                    <p>⚡ {e.electricity}</p>
                    <p>🧴 {e.plastic}</p>
                  </div>
                  <div className="mt-4 pt-3 border-t">
                    <p className="text-sm font-semibold text-emerald-700">
                      CO₂: {e.totalCO2} kg
                    </p>
                    <p className="text-sm font-bold text-green-700">
                      Eco Score: {e.ecoScore}/100
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default Tracker;
