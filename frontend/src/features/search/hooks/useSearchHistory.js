import { useState, useEffect } from 'react';

export function useSearchHistory() {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const stored = localStorage.getItem('nova-search-history');
    if (stored) {
      try {
        setHistory(JSON.parse(stored));
      } catch (e) {
        setHistory([]);
      }
    }
  }, []);

  const saveHistory = (newHistory) => {
    setHistory(newHistory);
    localStorage.setItem('nova-search-history', JSON.stringify(newHistory));
  };

  const addSearch = (item) => {
    if (!item) return;

    const filtered = history.filter((x) => {
      if (item.type === 'text') {
        return !(x.type === 'text' && x.query?.toLowerCase() === item.query?.toLowerCase());
      }
      return !(x.type === item.type && x.id === item.id);
    });

    // Limit search history to top 10 items
    const updated = [item, ...filtered].slice(0, 10);
    saveHistory(updated);
  };

  const removeSearch = (itemToDelete) => {
    const updated = history.filter((x) => {
      if (itemToDelete.type === 'text') {
        return !(x.type === 'text' && x.query === itemToDelete.query);
      }
      return !(x.type === itemToDelete.type && x.id === itemToDelete.id);
    });
    saveHistory(updated);
  };

  const clearAll = () => {
    saveHistory([]);
  };

  return { history, addSearch, removeSearch, clearAll };
}
