import React from "react";

const Pagination = ({ currentPage, totalPages, onPageChange }) => (
  <div className="flex justify-center space-x-2 mt-4">
    {Array.from({ length: totalPages }, (_, i) => (
      <button
        key={i}
        onClick={() => onPageChange(i + 1)}
        className={\`px-3 py-1 rounded \${currentPage === i + 1 ? 'bg-blue-500 text-white' : 'bg-gray-200'}\`}
      >
        {i + 1}
      </button>
    ))}
  </div>
);

export default Pagination;
