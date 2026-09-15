export default function ErrorAlert({ message }) {
  if (!message) return null;
  return <div className="alert">{message}</div>;
}
