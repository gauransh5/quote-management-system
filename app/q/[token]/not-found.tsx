/**
 * 404 page for invalid quote tokens.
 * Shown when a customer opens a link with a token that doesn't exist.
 */
export default function QuoteNotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-gray-50">
      <h1 className="text-2xl font-bold mb-2">Quote Not Found</h1>
      <p className="text-gray-600 text-center max-w-md">
        This quote link is invalid or has been removed. Please check the link
        and try again, or contact Boss Security for assistance.
      </p>
      <p className="text-sm text-gray-400 mt-4">
        +1 888-498-BOSS | bosssecurity.ca
      </p>
    </div>
  );
}
