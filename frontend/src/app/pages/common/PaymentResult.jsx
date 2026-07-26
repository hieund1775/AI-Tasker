import React, { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

export default function PaymentResult() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, loading } = useAuth();
  
  const status = searchParams.get("status"); // '1' is success in ZaloPay
  const amount = searchParams.get("amount") || searchParams.get("Amount") || 0;

  useEffect(() => {
    if (status === "1") {
      try {
        localStorage.setItem("aitasker_wallet_updated", Date.now().toString());
      } catch (e) {
        console.error("Failed to notify wallet update across tabs:", e);
      }
    }

    if (!loading && isAuthenticated && user) {
      if (status === "1") {
        const apptransid = searchParams.get("apptransid") || searchParams.get("app_trans_id") || `zalopay-${Date.now()}`;
        try {
          const deposits = JSON.parse(localStorage.getItem("zalopay_deposits") || "[]");
          if (!deposits.some(d => d.id === apptransid)) {
            deposits.push({
              id: apptransid,
              userId: user?.id || user?.Id,
              amount: Number(amount),
              createdAt: new Date().toISOString(),
            });
            localStorage.setItem("zalopay_deposits", JSON.stringify(deposits));
            localStorage.setItem("aitasker_wallet_updated", Date.now().toString());
            window.dispatchEvent(new CustomEvent("aitasker_db_update"));
          }
        } catch (e) {
          console.error("Failed to save local ZaloPay deposit:", e);
        }
      }

      // Redirect after 3 seconds to the correct wallet page
      const timer = setTimeout(() => {
        const returnUrl = sessionStorage.getItem("payment_return_url");
        if (returnUrl) {
          sessionStorage.removeItem("payment_return_url");
          navigate(returnUrl, { replace: true });
        } else if (user.role === "expert") {
          navigate("/expert/wallet", { replace: true });
        } else {
          // Client doesn't have a standalone wallet page, usually it's billing
          navigate("/client/billing", { replace: true });
        }
      }, 3000);
      return () => clearTimeout(timer);
    } else if (!loading && !isAuthenticated) {
      const timer = setTimeout(() => {
        navigate("/login", { replace: true });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [loading, isAuthenticated, user, navigate, status]);

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>;

  const isSuccess = status === "1";

  return (
    <div className="flex h-screen items-center justify-center bg-muted/30">
      <div className="bg-background p-8 rounded-xl shadow-lg max-w-md w-full text-center border">
        {isSuccess ? (
          <>
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-green-600 mb-2">Transaction Successful!</h2>
            <p className="text-muted-foreground mb-6">You have successfully deposited {Number(amount).toLocaleString()} VND into the system.</p>
          </>
        ) : (
          <>
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-red-600 mb-2">Transaction Unsuccessful</h2>
            <p className="text-muted-foreground mb-6">ZaloPay payment was cancelled or an error occurred.</p>
          </>
        )}
        <div className="flex justify-center items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Redirecting automatically...</span>
        </div>
      </div>
    </div>
  );
};

