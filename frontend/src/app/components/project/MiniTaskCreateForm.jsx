import { useState } from "react";
import { Plus, Trash2, GripVertical, ArrowUp, ArrowDown, Edit3, Check, X } from "lucide-react";
import { cn } from "../../lib/utils.js";

// =============================================================================
// MiniTaskCreateForm — expert-only form to create, edit, remove, and reorder
// mini tasks before confirmation.
//
// Props:
//   miniTasks     — current mini tasks array (draft state)
//   onAdd         — (data: {title, description, estimatedTime}) => void
//   onRemove       — (miniTaskId) => void
//   onReorder      — (orderedIds: string[]) => void
//   onUpdate       — (miniTaskId, updates) => void
//   onConfirm      — () => void — opens confirmation modal
//   disabled       — boolean (true when confirmed/locked)
// =============================================================================

export function MiniTaskCreateForm({
  miniTasks = [],
  onAdd,
  onRemove,
  onReorder,
  onUpdate,
  onConfirm,
  disabled = false,
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [estimatedTime, setEstimatedTime] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editEstimatedTime, setEditEstimatedTime] = useState("");

  const handleAdd = () => {
    if (!title.trim()) return;
    onAdd?.({
      title: title.trim(),
      description: description.trim(),
      estimatedTime: estimatedTime.trim(),
    });
    setTitle("");
    setDescription("");
    setEstimatedTime("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAdd();
    }
  };

  const startEditing = (mt) => {
    setEditingId(mt.id);
    setEditTitle(mt.title || "");
    setEditDescription(mt.description || "");
    setEditEstimatedTime(mt.estimatedTime || "");
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditTitle("");
    setEditDescription("");
    setEditEstimatedTime("");
  };

  const saveEditing = () => {
    if (!editTitle.trim()) return;
    onUpdate?.(editingId, {
      title: editTitle.trim(),
      description: editDescription.trim(),
      estimatedTime: editEstimatedTime.trim(),
    });
    cancelEditing();
  };

  const moveUp = (idx) => {
    if (idx <= 0) return;
    const newOrder = miniTasks.map((mt) => mt.id);
    [newOrder[idx - 1], newOrder[idx]] = [newOrder[idx], newOrder[idx - 1]];
    onReorder?.(newOrder);
  };

  const moveDown = (idx) => {
    if (idx >= miniTasks.length - 1) return;
    const newOrder = miniTasks.map((mt) => mt.id);
    [newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]];
    onReorder?.(newOrder);
  };

  if (disabled) return null;

  return (
    <div className="space-y-4">
      {/* Existing mini tasks list */}
      {miniTasks.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Mini Tasks ({miniTasks.length})
          </h4>
          {miniTasks.map((mt, idx) => (
            <div
              key={mt.id}
              className={cn(
                "flex items-start gap-2 p-3 bg-gray-50 rounded-xl border border-gray-200 group",
                editingId === mt.id && "bg-brand-primary-light border-blue-200"
              )}
            >
              <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
                <button
                  type="button"
                  onClick={() => moveUp(idx)}
                  disabled={idx === 0}
                  className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                  title="Move up"
                >
                  <ArrowUp className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => moveDown(idx)}
                  disabled={idx >= miniTasks.length - 1}
                  className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                  title="Move down"
                >
                  <ArrowDown className="w-3 h-3" />
                </button>
              </div>

              <GripVertical className="w-4 h-4 text-gray-300 flex-shrink-0 mt-1" />

              {editingId === mt.id ? (
                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-brand-primary"
                    placeholder="Title"
                    autoFocus
                  />
                  <input
                    type="text"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-brand-primary"
                    placeholder="Description (optional)"
                  />
                  <input
                    type="text"
                    value={editEstimatedTime}
                    onChange={(e) => setEditEstimatedTime(e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-brand-primary"
                    placeholder="Estimated time (e.g. '2 hours', '1 day')"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={saveEditing}
                      className="h-10 px-4 text-sm font-semibold bg-brand-primary text-white rounded-[14px] hover:bg-brand-primary-hover inline-flex items-center gap-1.5 transition"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={cancelEditing}
                      className="h-10 px-4 text-sm font-semibold border border-gray-300 text-gray-600 rounded-[14px] hover:bg-gray-100 transition"
                    >
                      <X className="w-3.5 h-3.5" />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{mt.title}</p>
                  {mt.description && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {mt.description}
                    </p>
                  )}
                  {mt.estimatedTime && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      Est: {mt.estimatedTime}
                    </p>
                  )}
                </div>
              )}

              {/* Actions */}
              {editingId !== mt.id && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => startEditing(mt)}
                    className="p-1 text-gray-400 hover:text-brand-primary"
                    title="Edit"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemove?.(mt.id)}
                    className="p-1 text-gray-400 hover:text-red-600"
                    title="Remove"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add new mini task form */}
      <div className="space-y-2 p-3 bg-brand-primary-light/50 rounded-lg border border-brand-primary/20">
        <h4 className="text-xs font-semibold text-brand-primary uppercase tracking-wider">
          Add Mini Task
        </h4>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-brand-primary"
          placeholder="Mini task title *"
        />
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-brand-primary"
          placeholder="Description (optional)"
        />
        <input
          type="text"
          value={estimatedTime}
          onChange={(e) => setEstimatedTime(e.target.value)}
          className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-brand-primary"
          placeholder="Estimated time (e.g. '2 hours', '1 day')"
        />
        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={handleAdd}
            disabled={!title.trim()}
            className="px-5 py-2 bg-brand-primary text-white rounded-xl hover:bg-brand-primary-hover disabled:bg-gray-300 disabled:cursor-not-allowed text-[15px] font-medium inline-flex items-center gap-2 transition"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>

          {miniTasks.length > 0 && (
            <button
              type="button"
              onClick={onConfirm}
              className="px-5 py-2 bg-brand-green text-white rounded-xl hover:bg-brand-green/90 text-[15px] font-medium transition"
            >
              Confirm & Save
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
