export const toastConfig = {
    position: "top-right",
    autoClose: 5000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    theme: "dark",
    style: {
        background: "#192630",
        color: "#ffffff",
        borderRadius: "12px",
        border: "1px solid #374151",
    },
};

export const toastStyles = {
    success: {
        icon: "✅",
        progressBar: {
            background: "linear-gradient(to right, #10b981, #059669)",
        },
    },
    error: {
        icon: "❌",
        progressBar: {
            background: "linear-gradient(to right, #ef4444, #dc2626)",
        },
    },
    info: {
        icon: "ℹ️",
        progressBar: {
            background: "linear-gradient(to right, #3b82f6, #2563eb)",
        },
    },
    warning: {
        icon: "⚠️",
        progressBar: {
            background: "linear-gradient(to right, #f59e0b, #d97706)",
        },
    },
    loading: {
        icon: "⏳",
        progressBar: {
            background: "linear-gradient(to right, #6366f1, #4f46e5)",
        },
    },
};