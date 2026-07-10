import DecisionModal from "./DecisionModal";

/**
 * Backward-compatible reject modal wrapper.
 * Prefer DecisionModal for new accept/reject flows with applicant-visible comments.
 */
const RejectModal = ({ open, title, itemName = "item", onConfirm, onClose, loading = false }) => {
  return (
    <DecisionModal
      open={open}
      mode="reject"
      candidateName={itemName}
      jobTitle={title || "this application"}
      onConfirm={onConfirm}
      onClose={onClose}
      loading={loading}
    />
  );
};

export default RejectModal;
