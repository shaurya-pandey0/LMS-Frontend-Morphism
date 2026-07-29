/**
 * Shared SegmentedTabs component for switching between views (e.g. Today / History).
 *
 * @param {Array<{ id: string, label: string }>} tabs  List of tab objects.
 * @param {string} activeTab                            Currently active tab ID.
 * @param {Function} onTabChange                        Callback invoked with selected tab ID.
 * @param {string} [className]                          CSS class for the container (default: page-specific tab wrapper).
 * @param {string} [btnClass]                           CSS base class for each button (e.g. 'daily-log__tab').
 *                                                      Active state appends '--active' to this class.
 */
export default function SegmentedTabs({ tabs, activeTab, onTabChange, className = 'segmented-tabs', btnClass = 'segmented-tabs__btn' }) {
  return (
    <div className={className}>
      {tabs.map(({ id, label }) => {
        const isActive = activeTab === id;
        return (
          <button
            key={id}
            type="button"
            id={`tab-${id}`}
            className={`${btnClass}${isActive ? ` ${btnClass}--active` : ''}`}
            onClick={() => onTabChange(id)}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
