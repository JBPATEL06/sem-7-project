import React from 'react';

interface DriveExpiredBannerProps {
  onReauthorizeDrive: () => void;
}

export const DriveExpiredBanner: React.FC<DriveExpiredBannerProps> = ({ onReauthorizeDrive }) => {
  return (
    <div className="center-screen">
      <div className="banner-card">
        <div className="banner-icon expired">⚠</div>
        <h2>Drive connection expired</h2>
        <p>Your Google Drive session ended or was revoked. Reconnect to keep viewing your synced projects.</p>
        <button onClick={onReauthorizeDrive} className="btn-reauth">
          Re-authorize Google Drive
        </button>
      </div>
    </div>
  );
};
