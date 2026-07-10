import { Search, MapPin } from "lucide-react";

const SearchBar = ({ filters, onFiltersChange }) => {
  const handleKeywordChange = (event) => {
    onFiltersChange({
      ...filters,
      keyword: event.target.value,
    });
  };

  const handleLocationChange = (event) => {
    onFiltersChange({
      ...filters,
      location: event.target.value,
    });
  };

  return (
    <div className="w-full border-y border-[#4242425C]/25 py-3">
      <div className="mx-auto flex w-full max-w-160 flex-col overflow-hidden rounded-2xl border border-[#DBDBDB] bg-[#F5F5F5] sm:flex-row sm:items-center sm:rounded-full">
        <div className="flex min-w-0 flex-1 items-center gap-2 px-4 py-2">
          <Search className="h-4 w-4 shrink-0 text-[#9F9F9F]" />
        <input
          type="text"
          placeholder="Find your perfect job"
            value={filters.keyword}
            onChange={handleKeywordChange}
            className="min-w-0 flex-1 bg-transparent text-sm text-[#292624] outline-none placeholder:text-[#B0B0B0]"
        />
      </div>
        <div className="h-px w-full bg-[#E2E2E2] sm:h-6 sm:w-px" />
        <div className="flex min-w-0 flex-1 items-center gap-2 px-4 py-2">
          <MapPin className="h-4 w-4 shrink-0 text-[#9F9F9F]" />
        <input
          type="text"
          placeholder="City, State, or 'remote'"
            value={filters.location}
            onChange={handleLocationChange}
            className="min-w-0 flex-1 bg-transparent text-sm text-[#292624] outline-none placeholder:text-[#B0B0B0]"
        />
      </div>
    </div>
    </div>
  );
};

export default SearchBar;
