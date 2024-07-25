// @ts-nocheck
import React, { useState } from 'react';
import Draggable from 'react-draggable';
import { useAccount } from 'wagmi';


function StatusBar({ address, status, error }: { address: any, status: any, error: any }) {
    return (
        <div className="status-bar">
            <p className="status-bar-field">Wallet Address: {address}</p>
            <p className="status-bar-field">Wallet Status: {status}</p>
            <p className="status-bar-field">Error: {error?.message ?? "None"}</p>
        </div>
    )
}

export function AppWindowWithTitleBar({ children, status, error, onClose, onMinimize, className = '', bodyClassName = '',
    title = 'Based Remy Boys' }) {
    const [isMaximized, setIsMaximized] = useState(false);
    const account = useAccount();

    const handleMaximize = () => {
        setIsMaximized(!isMaximized);
    };

    // only show statusbar if status or error is present
    let showStatusBar = status || error;
    let statusBar = showStatusBar ? <StatusBar address={account.address?.toString()} status={status} error={error} /> : null;

    return (
        <Draggable
            handle=".title-bar"
            bounds={{ top: 0, left: 0, right: 0, bottom: document.body.clientHeight - 50 }}
            disabled={isMaximized}
        >
            <div className={`window ${isMaximized ? 'maximized' : ''}` + className}>
                <div className="title-bar">
                    <div className="title-bar-text">{title}</div>
                    <div className="title-bar-controls">
                        <button aria-label="Minimize"></button>
                        <button aria-label="Maximize" onClick={handleMaximize}></button>
                        <button aria-label="Close" onClick={onClose}></button>
                    </div>
                </div>
                <div className={`window-body ${bodyClassName}`}>
                    {children}
                </div>
                {statusBar}
            </div>
        </Draggable>
    );
}
