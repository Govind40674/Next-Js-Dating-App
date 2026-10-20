"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";

const MAX_LOGS = 2000;
const STORAGE_KEY = "mobile_debug_console_logs";

function getTimestamp() {
  return new Date().toLocaleTimeString("en-IN", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function serializeValue(value) {
  const seen = new WeakSet();

  try {
    return JSON.stringify(
      value,
      (key, item) => {
        if (typeof item === "bigint") {
          return item.toString();
        }

        if (item instanceof Error) {
          return {
            name: item.name,
            message: item.message,
            stack: item.stack,
          };
        }

        if (item instanceof Event) {
          return {
            type: item.type,
            target: item.target?.constructor?.name,
          };
        }

        if (typeof item === "object" && item !== null) {
          if (seen.has(item)) {
            return "[Circular]";
          }

          seen.add(item);
        }

        return item;
      },
      2
    );
  } catch {
    try {
      return String(value);
    } catch {
      return "[Unable to serialize value]";
    }
  }
}

function formatArguments(args) {
  return args
    .map((arg) => {
      if (typeof arg === "string") {
        return arg;
      }

      if (arg instanceof Error) {
        return `${arg.name}: ${arg.message}\n${arg.stack || ""}`;
      }

      if (typeof arg === "undefined") {
        return "undefined";
      }

      if (typeof arg === "function") {
        return `[Function ${arg.name || "anonymous"}]`;
      }

      if (typeof arg === "symbol") {
        return String(arg);
      }

      if (typeof arg === "object" && arg !== null) {
        return serializeValue(arg);
      }

      return String(arg);
    })
    .join(" ");
}

function getDeviceInformation() {
  if (typeof window === "undefined") {
    return {};
  }

  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    online: navigator.onLine,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    devicePixelRatio: window.devicePixelRatio,
    url: window.location.href,
    timestamp: new Date().toISOString(),
  };
}

function loadSavedLogs() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      return [];
    }

    const parsed = JSON.parse(saved);

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function DebugConsole() {
  const [logs, setLogs] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState("ALL");
  const [autoScroll, setAutoScroll] = useState(true);
  const [deviceInfo, setDeviceInfo] = useState(null);

  const logContainerRef = useRef(null);
  const logsRef = useRef([]);
  const initializedRef = useRef(false);
  const originalConsoleRef = useRef(null);

  const addLog = useCallback((level, message, details = "") => {
    const entry = {
      id: `${Date.now()}-${Math.random()}`,
      time: getTimestamp(),
      level,
      message,
      details,
    };

    const nextLogs = [...logsRef.current, entry].slice(-MAX_LOGS);

    logsRef.current = nextLogs;
    setLogs(nextLogs);

    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(nextLogs)
      );
    } catch {
      // Continue logging even when storage is unavailable.
    }
  }, []);

  useEffect(() => {
    if (initializedRef.current) {
      return;
    }

    initializedRef.current = true;

    setDeviceInfo(getDeviceInformation());

    // Restore logs captured earlier on this device.
    const savedLogs = loadSavedLogs();

    logsRef.current = savedLogs;
    setLogs(savedLogs);

    // Preserve the browser's original console methods.
    const original = {
      log: console.log.bind(console),
      info: console.info.bind(console),
      warn: console.warn.bind(console),
      error: console.error.bind(console),
      debug: console.debug.bind(console),
      trace: console.trace.bind(console),
    };

    originalConsoleRef.current = original;

    const levels = [
      "log",
      "info",
      "warn",
      "error",
      "debug",
      "trace",
    ];

    const patchedMethods = {};

    levels.forEach((level) => {
      patchedMethods[level] = (...args) => {
        // Preserve normal browser console output.
        original[level](...args);

        // Also display it inside the on-screen console.
        addLog(
          level === "trace" ? "DEBUG" : level.toUpperCase(),
          formatArguments(args)
        );
      };

      console[level] = patchedMethods[level];
    });

    // Capture uncaught JavaScript errors.
    const handleWindowError = (event) => {
      const message =
        event.message ||
        event.error?.message ||
        "Unknown JavaScript error";

      addLog(
        "ERROR",
        `Uncaught JavaScript error: ${message}`,
        [
          event.filename ? `File: ${event.filename}` : "",
          event.lineno ? `Line: ${event.lineno}` : "",
          event.colno ? `Column: ${event.colno}` : "",
          event.error?.stack || "",
        ]
          .filter(Boolean)
          .join("\n")
      );
    };

    window.addEventListener("error", handleWindowError);

    // Capture unhandled Promise rejections.
    const handleUnhandledRejection = (event) => {
      const reason = event.reason;

      addLog(
        "ERROR",
        "Unhandled Promise rejection",
        reason instanceof Error
          ? `${reason.name}: ${reason.message}\n${reason.stack || ""}`
          : formatArguments([reason])
      );
    };

    window.addEventListener(
      "unhandledrejection",
      handleUnhandledRejection
    );

    // Record online/offline transitions.
    const handleOnline = () => {
      addLog("INFO", "Device is online.");
    };

    const handleOffline = () => {
      addLog("WARN", "Device is offline.");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Record page visibility changes.
    const handleVisibilityChange = () => {
      addLog(
        "INFO",
        `Page visibility changed: ${document.visibilityState}`
      );
    };

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    // --------------------------------------------------
    // FETCH REQUEST AND RESPONSE MONITORING
    // --------------------------------------------------

    const originalFetch = window.fetch.bind(window);

    window.fetch = async (...args) => {
      const input = args[0];
      const options = args[1] || {};

      const url =
        typeof input === "string"
          ? input
          : input?.url || String(input);

      const method = (
        options.method ||
        input?.method ||
        "GET"
      ).toUpperCase();

      const startedAt = Date.now();

      addLog(
        "NETWORK",
        `FETCH ${method} ${url}`
      );

      try {
        const response = await originalFetch(...args);

        const duration = Date.now() - startedAt;

        addLog(
          response.ok ? "NETWORK" : "ERROR",
          `FETCH ${response.status} ${method} ${url}`,
          `Status: ${response.status}\n` +
            `Status text: ${response.statusText}\n` +
            `Duration: ${duration} ms`
        );

        return response;
      } catch (error) {
        addLog(
          "ERROR",
          `FETCH FAILED ${method} ${url}`,
          `${error?.name || "Error"}: ${error?.message || error}`
        );

        throw error;
      }
    };

    addLog(
      "INFO",
      "Debug console initialized on this device.",
      serializeValue(getDeviceInformation())
    );

    addLog(
      "INFO",
      `Device type: ${
        /iPhone|iPad|iPod/i.test(navigator.userAgent)
          ? "Apple mobile device"
          : /Android/i.test(navigator.userAgent)
            ? "Android device"
            : "Desktop or other browser"
      }`
    );

    return () => {
      // Restore original browser console methods.
      Object.entries(original).forEach(([level, method]) => {
        console[level] = method;
      });

      window.fetch = originalFetch;

      window.removeEventListener(
        "error",
        handleWindowError
      );

      window.removeEventListener(
        "unhandledrejection",
        handleUnhandledRejection
      );

      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );

      initializedRef.current = false;
    };
  }, [addLog]);

  useEffect(() => {
    if (!isOpen || !autoScroll) {
      return;
    }

    const container = logContainerRef.current;

    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [logs, isOpen, autoScroll]);

  const clearLogs = () => {
    logsRef.current = [];
    setLogs([]);

    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage errors.
    }

    addLog("INFO", "Logs cleared.");
  };

  const copyLogs = async () => {
    const output = logsRef.current
      .map((entry) => {
        return (
          `[${entry.time}] [${entry.level}] ${entry.message}` +
          (entry.details ? `\n${entry.details}` : "")
        );
      })
      .join("\n\n");

    try {
      await navigator.clipboard.writeText(output);

      addLog("INFO", "Logs copied to clipboard.");
    } catch (error) {
      // Clipboard API may be restricted in some browsers.
      try {
        const textarea = document.createElement("textarea");

        textarea.value = output;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";

        document.body.appendChild(textarea);

        textarea.select();

        const success = document.execCommand("copy");

        textarea.remove();

        if (!success) {
          throw error;
        }

        addLog("INFO", "Logs copied to clipboard.");
      } catch {
        addLog(
          "ERROR",
          "Could not copy logs. Try selecting the log text manually."
        );
      }
    }
  };

  const filteredLogs =
    filter === "ALL"
      ? logs
      : logs.filter((entry) => entry.level === filter);

  const errorCount = logs.filter(
    (entry) => entry.level === "ERROR"
  ).length;

  const warningCount = logs.filter(
    (entry) => entry.level === "WARN"
  ).length;

  const levelColor = (level) => {
    switch (level) {
      case "ERROR":
        return "#ff6868";
      case "WARN":
        return "#ffd166";
      case "NETWORK":
        return "#7dd3fc";
      case "INFO":
        return "#86efac";
      case "DEBUG":
        return "#c4b5fd";
      default:
        return "#e5e7eb";
    }
  };

  return (
    <>
      {/* Floating button visible on mobile and desktop. */}
      <button
        type="button"
        onClick={() => setIsOpen((previous) => !previous)}
        style={{
          position: "fixed",
          right: 12,
          bottom: 12,
          zIndex: 2147483647,
          border: "1px solid #64748b",
          borderRadius: 12,
          padding: "12px 16px",
          background: "#111827",
          color: "#fff",
          fontSize: 14,
          fontWeight: 600,
          boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
          cursor: "pointer",
          maxWidth: "90vw",
        }}
      >
        {isOpen ? "Close Debug Console" : "Open Debug Console"} (
        {logs.length})
      </button>

      {isOpen && (
        <section
          style={{
            position: "fixed",
            inset: "8px",
            zIndex: 2147483646,
            display: "flex",
            flexDirection: "column",
            background: "#080d16",
            color: "#e5e7eb",
            border: "1px solid #475569",
            borderRadius: 12,
            overflow: "hidden",
            boxShadow: "0 0 30px rgba(0,0,0,0.7)",
            fontFamily: "monospace",
            fontSize: 12,
          }}
        >
          {/* Header */}
          <header
            style={{
              padding: 12,
              background: "#111827",
              borderBottom: "1px solid #334155",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <strong style={{ fontSize: 15 }}>
                Mobile Debug Console
              </strong>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                style={buttonStyle}
              >
                Close ✕
              </button>
            </div>

            <div style={{ marginTop: 8, color: "#94a3b8" }}>
              Total: {logs.length} | Errors: {errorCount} | Warnings:{" "}
              {warningCount}
            </div>

            {deviceInfo && (
              <div
                style={{
                  marginTop: 8,
                  color: "#7dd3fc",
                  overflowWrap: "anywhere",
                }}
              >
                Device:{" "}
                {/iPhone|iPad|iPod/i.test(deviceInfo.userAgent)
                  ? "iPhone/iPad"
                  : /Android/i.test(deviceInfo.userAgent)
                    ? "Android"
                    : "Desktop/Other"}
                <br />
                Online: {String(deviceInfo.online)}
                <br />
                Viewport: {deviceInfo.viewportWidth} ×{" "}
                {deviceInfo.viewportHeight}
                <br />
                URL: {deviceInfo.url}
              </div>
            )}
          </header>

          {/* Toolbar */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              padding: 8,
              background: "#0f172a",
              borderBottom: "1px solid #334155",
              flexShrink: 0,
            }}
          >
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              style={selectStyle}
            >
              <option value="ALL">All logs</option>
              <option value="LOG">Logs</option>
              <option value="INFO">Info</option>
              <option value="WARN">Warnings</option>
              <option value="ERROR">Errors</option>
              <option value="DEBUG">Debug</option>
              <option value="NETWORK">Network</option>
            </select>

            <button
              type="button"
              onClick={copyLogs}
              style={buttonStyle}
            >
              Copy Logs
            </button>

            <button
              type="button"
              onClick={clearLogs}
              style={buttonStyle}
            >
              Clear Logs
            </button>

            <button
              type="button"
              onClick={() => setAutoScroll((previous) => !previous)}
              style={buttonStyle}
            >
              Auto-scroll: {autoScroll ? "ON" : "OFF"}
            </button>
          </div>

          {/* Logs */}
          <div
            ref={logContainerRef}
            onScroll={(event) => {
              const element = event.currentTarget;

              const nearBottom =
                element.scrollHeight -
                  element.scrollTop -
                  element.clientHeight <
                40;

              if (nearBottom && !autoScroll) {
                setAutoScroll(true);
              }
            }}
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              WebkitOverflowScrolling: "touch",
              padding: 8,
              overscrollBehavior: "contain",
            }}
          >
            {filteredLogs.length === 0 ? (
              <div
                style={{
                  padding: 20,
                  textAlign: "center",
                  color: "#94a3b8",
                }}
              >
                No logs found for this filter.
              </div>
            ) : (
              filteredLogs.map((entry) => (
                <article
                  key={entry.id}
                  style={{
                    padding: "8px 4px",
                    borderBottom: "1px solid #1e293b",
                    overflowWrap: "anywhere",
                    whiteSpace: "pre-wrap",
                    lineHeight: 1.5,
                  }}
                >
                  <div>
                    <span style={{ color: "#94a3b8" }}>
                      [{entry.time}]
                    </span>{" "}
                    <strong
                      style={{
                        color: levelColor(entry.level),
                      }}
                    >
                      [{entry.level}]
                    </strong>
                  </div>

                  <div style={{ marginTop: 3 }}>
                    {entry.message}
                  </div>

                  {entry.details && (
                    <pre
                      style={{
                        margin: "5px 0 0",
                        color: "#cbd5e1",
                        whiteSpace: "pre-wrap",
                        overflowWrap: "anywhere",
                        font: "inherit",
                      }}
                    >
                      {entry.details}
                    </pre>
                  )}
                </article>
              ))
            )}
          </div>

          {/* Footer */}
          <footer
            style={{
              padding: 8,
              background: "#111827",
              color: "#94a3b8",
              borderTop: "1px solid #334155",
              flexShrink: 0,
            }}
          >
            Capturing console messages, JavaScript errors, rejected
            promises, and fetch requests on this device.
          </footer>
        </section>
      )}
    </>
  );
}

const buttonStyle = {
  padding: "8px 10px",
  borderRadius: 6,
  border: "1px solid #475569",
  background: "#1e293b",
  color: "#fff",
  fontSize: 12,
  cursor: "pointer",
};

const selectStyle = {
  padding: "8px",
  borderRadius: 6,
  border: "1px solid #475569",
  background: "#1e293b",
  color: "#fff",
  fontSize: 12,
};