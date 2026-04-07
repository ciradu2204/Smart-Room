import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <h1 className="text-4xl font-semibold text-gray-900">404</h1>
      <p className="text-gray-500">Page not found.</p>
      <Link to="/" className="btn-primary">
        Back to Dashboard
      </Link>
    </div>
  )
}
