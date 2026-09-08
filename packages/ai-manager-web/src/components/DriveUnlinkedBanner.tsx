import React from 'react';

interface DriveUnlinkedBannerProps {
  onConnectDrive: () => void;
}

export const DriveUnlinkedBanner: React.FC<DriveUnlinkedBannerProps> = ({ onConnectDrive }) => {
  return (
    <div className="center-screen">
      <div className="banner-card">
        <div className="banner-icon unlinked">☁</div>
        <h2>Connect your Google Drive</h2>
        <p>Your synced project context lives in your own Google Drive. Connect it to see your projects here.</p>
        <button onClick={onConnectDrive} className="btn-connect">
          Connect Google Drive
        </button>
      </div>
    </div>
  );
};
