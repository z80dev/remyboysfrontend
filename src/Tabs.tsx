// @ts-nocheck
import React, { useState } from 'react';

const TabGroup = ({ children, onHandleTabClick }) => {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabClick = (index) => {
    setActiveTab(index);
    if (onHandleTabClick) {
      onHandleTabClick(index);
    }
  };

  return (
    <section className="tabs">
      <menu role="tablist" aria-label="Tabs Template">
        {React.Children.map(children, (child, index) => (
          <button
            key={index}
            role="tab"
            aria-controls={`tab-${index}`}
            aria-selected={activeTab === index}
            onClick={() => handleTabClick(index)}
            disabled={child.props.disabled}
          >
            {child.props.label}
          </button>
        ))}
      </menu>
      {React.Children.map(children, (child, index) => (
        <article
          key={index}
          role="tabpanel"
          id={`tab-${index}`}
          hidden={activeTab !== index}
        >
          {child.props.children}
        </article>
      ))}
    </section>
  );
};

const Tab = ({ label, children }) => {
  return <div>{children}</div>;
};

export { TabGroup, Tab };
