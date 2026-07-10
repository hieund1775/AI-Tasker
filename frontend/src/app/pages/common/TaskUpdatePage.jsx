import { useEffect } from "react";
import { useParams, useNavigate } from "react-router";

export function TaskUpdatePage() {
  const { taskId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    // TaskUpdatePage has been unified into TaskDetailPage
    navigate(`/client/tasks/${taskId}`, { replace: true });
  }, [taskId, navigate]);

  return null;
}
