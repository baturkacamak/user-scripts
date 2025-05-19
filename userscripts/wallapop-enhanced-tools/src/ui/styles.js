// Styles for the Wallapop Enhanced Tools

import {StyleManager} from "../../../common/core";
import {SELECTORS} from '../utils/constants';
import {Button, SectionToggler} from "../../../common/core";

/**
 * Add all styles needed for the Wallapop Enhanced Tools
 */
export function addStyles() {
        
    StyleManager.addStyles(`
        :root {
            --transition-speed: 0.3s;
            --transition-easing: ease-in-out;
            --panel-background: #ffffff;
            --panel-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
            --panel-border-radius: 8px;
            --panel-accent-color: #008080;
            --panel-hover-color: #006666;
            
            /* Set Wallapop colors for progress bar components */
            --userscripts-progress-bar-bg: #f3f3f3;
            --userscripts-progress-label-color: #333;
            --userscripts-progress-text-color: #333;
            
            /* Teal color theme for Wallapop */
            --userscripts-progress-primary-fill-gradient-start: #008080;
            --userscripts-progress-primary-fill-gradient-end: #006666;
            
            /* Success theme (green) */
            --userscripts-progress-success-fill-gradient-start: #4CAF50;
            --userscripts-progress-success-fill-gradient-end: #45a049;
            
            /* Warning theme (orange) */
            --userscripts-progress-warning-fill-gradient-start: #FF9800;
            --userscripts-progress-warning-fill-gradient-end: #F57C00;
            
            /* Checkbox component variables */
            --userscripts-checkbox-bg: #ffffff;
            --userscripts-checkbox-border-color: #d1d5db;
            --userscripts-checkbox-hover-bg: #f0f0f0;
            --userscripts-checkbox-hover-border: #9ca3af;
            --userscripts-checkbox-checked-bg: #008080;
            --userscripts-checkbox-checked-border: #008080;
            --userscripts-checkbox-checkmark-color: #ffffff;
            --userscripts-checkbox-focus-shadow: rgba(0, 128, 128, 0.3);
            
            /* SectionToggler variables */
            --userscripts-section-bg: #ffffff;
            --userscripts-section-border-color: #e5e7eb;
            --userscripts-section-header-bg: #f9fafb;
            --userscripts-section-header-hover-bg: #f3f4f6;
            --userscripts-section-title-color: #374151;
            --userscripts-section-icon-color: #9ca3af;
            --userscripts-section-icon-hover-color: #6b7280;
            --userscripts-section-content-bg: #ffffff;
            --userscripts-section-content-max-height: 500px;
            
            /* SectionToggler primary theme */
            --userscripts-section-primary-header-bg: #f0f8f8;
            --userscripts-section-primary-title-color: #008080;
            --userscripts-section-primary-icon-color: #008080;
            
            /* SectionToggler success theme */
            --userscripts-section-success-header-bg: #ecfdf5;
            --userscripts-section-success-title-color: #059669;
            --userscripts-section-success-icon-color: #10b981;
            
            /* Sidebar panel variables */
            --wallapop-enhanced-sidebar-panel-button-bg: #008080;
            --wallapop-enhanced-sidebar-panel-button-bg-hover: #006666;
            --wallapop-enhanced-sidebar-panel-title-color: #008080;
            --wallapop-enhanced-sidebar-panel-header-bg: #f0f8f8;
            --wallapop-enhanced-sidebar-panel-border-color: #e5e7eb;
        }

        /* Control Panel Styles */
        .control-panel {
            position: fixed;
            top: 120px;
            right: 20px;
            background-color: var(--panel-background);
            border-radius: var(--panel-border-radius);
            box-shadow: var(--panel-shadow);
            padding: 0;
            z-index: 9999;
            width: 280px;
            display: flex;
            flex-direction: column;
            transition: opacity var(--transition-speed) var(--transition-easing),
                        transform var(--transition-speed) var(--transition-easing);
        }
        
        .userscripts-draggable-container__handle {
            font-weight: bold;
            font-size: 14px;
            padding: 10px 15px;
            color: #fff;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-radius: var(--panel-border-radius) var(--panel-border-radius) 0 0;
        }

        .panel-toggle {
            cursor: pointer;
            user-select: none;
            transition: transform 0.3s var(--transition-easing);
        }

        .panel-content {
            display: flex;
            flex-direction: column;
            max-height: 800px;
            overflow: hidden;
            opacity: 1;
            transition: max-height var(--transition-speed) var(--transition-easing),
                        opacity var(--transition-speed) var(--transition-easing);
        }

        .panel-content.collapsed {
            max-height: 0;
            opacity: 0;
        }

        .panel-section {
            border-bottom: 1px solid #eee;
        }

        .panel-section:last-child {
            border-bottom: none;
        }

        .filter-input {
            padding: 8px;
            border: 1px solid #ccc;
            border-radius: 4px;
            font-size: 14px;
            width: 100%;
            box-sizing: border-box;
            transition: border-color var(--transition-speed) var(--transition-easing);
        }

        .filter-input:focus {
            border-color: var(--panel-accent-color);
            outline: none;
        }

        .panel-button {
            ${Button.CSS_VAR_PREFIX}bg-hover: var(--panel-hover-color);
            ${Button.CSS_VAR_PREFIX}bg: var(--panel-accent-color);
            ${Button.CSS_VAR_PREFIX}color: white;
            display: block;
            border: none;
            border-radius: 4px;
            padding: 8px 12px;
            margin-top: 10px;
            cursor: pointer;
            font-size: 14px;
            width: 100%;
            text-align: center;
            transition: background-color var(--transition-speed) var(--transition-easing);
        }

        .copy-button {
            ${Button.CSS_VAR_PREFIX}bg-hover: var(--panel-hover-color);
            ${Button.CSS_VAR_PREFIX}bg: var(--panel-accent-color);
            ${Button.CSS_VAR_PREFIX}color: white;
            display: block;
            border: none;
            border-radius: 4px;
            padding: 8px 12px;
            cursor: pointer;
            font-size: 14px;
            width: 100%;
            text-align: left;
            transition: background-color var(--transition-speed) var(--transition-easing);
        }

        .copy-success {
            background-color: #4CAF50;
            transition: background-color var(--transition-speed) var(--transition-easing);
        }

        .blocked-terms-list {
            max-height: 150px;
            overflow-y: auto;
            margin-top: 10px;
        }

        .blocked-term-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px;
            background-color: #f0f0f0;
            border-radius: 4px;
            margin-bottom: 5px;
            animation: fadeIn 0.3s ease-in-out;
        }

        .remove-term {
            background: none;
            border: none;
            color: #ff6b6b;
            cursor: pointer;
            font-weight: bold;
            font-size: 16px;
            transition: transform var(--transition-speed) var(--transition-easing),
                        color var(--transition-speed) var(--transition-easing);
        }

        .remove-term:hover {
            transform: scale(1.2);
            color: #ff4040;
        }

        .copy-dropdown {
            position: relative;
            display: inline-block;
            width: 100%;
            margin-top: 10px;
        }

        .panel-content .${SectionToggler.BASE_SECTION_CLASS} {
            margin-bottom: 0;
            border: 0 none;
        }

        .dropdown-content {
            display: block;
            position: absolute;
            background-color: #f1f1f1;
            min-width: 160px;
            box-shadow: 0px 8px 16px rgba(0, 0, 0, 0.2);
            z-index: 1;
            right: 0;
            margin-top: 2px;
            max-height: 0;
            overflow: hidden;
            opacity: 0;
            pointer-events: none;
            transition: max-height var(--transition-speed) var(--transition-easing),
                        opacity var(--transition-speed) var(--transition-easing);
        }

        .dropdown-content.top {
            bottom: 100%;
            margin-top: 0;
            margin-bottom: 2px;
        }

        .copy-dropdown:hover .dropdown-content {
            max-height: 200px;
            opacity: 1;
            pointer-events: auto;
        }

        .dropdown-content button {
            color: black;
            padding: 12px 16px;
            background: none;
            border: none;
            width: 100%;
            text-align: left;
            cursor: pointer;
            transition: background-color var(--transition-speed) var(--transition-easing);
        }

        .dropdown-content button:hover {
            background-color: #ddd;
        }

        .language-selector {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 10px;
        }

        .language-selector .userscripts-button.lang-button {
            ${Button.CSS_VAR_PREFIX}bg: #f0f0f0;
            ${Button.CSS_VAR_PREFIX}bg-hover: #e0e0e0;
            ${Button.CSS_VAR_PREFIX}border: #ccc;
            flex-grow: 1;
            flex-basis: 45%;
            border-width: 1px;
            border-style: solid;
            border-radius: 4px;
            padding: 8px 12px;
            cursor: pointer;
            font-size: 14px;
            text-align: center;
            transition: background-color var(--transition-speed) var(--transition-easing),
                        border-color var(--transition-speed) var(--transition-easing);
        }
        
        .language-selector .userscripts-button.lang-button.active {
            background-color: var(--panel-accent-color);
            color: white;
            border-color: var(--panel-accent-color);
        }

        .expand-button {
            background: none;
            border: none;
            color: #008080;
            cursor: pointer;
            padding: 5px;
            font-size: 12px;
            text-decoration: underline;
            transition: opacity var(--transition-speed) var(--transition-easing);
        }

        .description-content {
            max-height: 0;
            overflow: hidden;
            padding: 0 10px;
            background-color: #f0f0f0;
            border-radius: 5px;
            margin-top: 5px;
            font-size: 14px;
            white-space: pre-wrap;
            word-wrap: break-word;
            transition: max-height var(--transition-speed) var(--transition-easing),
                        padding var(--transition-speed) var(--transition-easing);
        }

        .description-content.expanded {
            max-height: 1000px;
            padding: 10px;
            transition: max-height 0.5s var(--transition-easing),
                        padding var(--transition-speed) var(--transition-easing);
        }

        .error-message {
            color: #ff0000;
            font-style: italic;
        }

        @keyframes fadeIn {
            from {
                opacity: 0;
                transform: translateY(-10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        @keyframes fadeOut {
            from {
                opacity: 1;
                transform: translateY(0);
            }
            to {
                opacity: 0;
                transform: translateY(-10px);
            }
        }

        .fadeOutAnimation {
            animation: fadeOut 0.3s ease-in-out forwards;
        }

        .hidden-item {
            display: none !important;
        }

        .hiding-animation {
            animation: fadeOut 0.5s ease-in-out forwards;
        }

        /* Export Format Styles */
        .export-section {
            position: relative;
        }

        .format-selector-container {
            position: relative;
            margin-top: 10px;
        }

        .format-selector {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid #ccc;
            border-radius: 4px;
            font-size: 14px;
            cursor: pointer;
            background-color: white;
            text-align: left;
            position: relative;
        }

        .format-selector:after {
            content: '▼';
            position: absolute;
            right: 10px;
            top: 50%;
            transform: translateY(-50%);
        }

        .format-dropdown {
            position: absolute;
            width: 100%;
            max-height: 0;
            overflow: hidden;
            background-color: white;
            border-radius: 4px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
            z-index: 10;
            transition: max-height var(--transition-speed) var(--transition-easing);
        }

        .format-dropdown.active {
            max-height: 300px;
            overflow-y: auto;
            border: 1px solid #ccc;
        }

        .format-categories {
            list-style: none;
            padding: 0;
            margin: 0;
        }

        .format-category-label {
            padding: 8px 12px;
            font-weight: bold;
            background-color: #f5f5f5;
            border-bottom: 1px solid #eee;
        }

        .format-list {
            list-style: none;
            padding: 0;
            margin: 0;
        }

        .format-item {
            position: relative;
            cursor: pointer;
        }

        .format-label {
            padding: 8px 12px 8px 20px;
            border-bottom: 1px solid #eee;
        }

        .format-item.selected .format-label {
            background-color: #e0f0f0;
            color: var(--panel-accent-color);
        }

        .format-item:hover .format-label {
            background-color: #f0f0f0;
        }

        .options-toggle {
            position: absolute;
            right: 10px;
            top: 50%;
            transform: translateY(-50%);
            background: none;
            border: none;
            font-size: 12px;
            color: #777;
            cursor: pointer;
            padding: 4px;
        }

        .format-options {
            padding: 5px 10px;
            background-color: #f9f9f9;
            border-bottom: 1px solid #eee;
        }

        .format-options.hidden {
            display: none;
        }

        .option-row {
            display: flex;
            align-items: center;
            margin: 8px 0;
        }
        
        /* Customize Checkbox component to match existing styling */
        .option-row .userscripts-checkbox-container {
            width: 100%;
        }
        
        .option-row .userscripts-checkbox-label {
            font-size: 12px;
            color: #555;
        }

        .export-buttons-container .export-success {
            ${Button.CSS_VAR_PREFIX}bg: #4CAF50;
            ${Button.CSS_VAR_PREFIX}bg-hover: var(--panel-hover-color);
            transition: background-color var(--transition-speed) var(--transition-easing);
        }

        .export-buttons-container {
            display: flex;
            gap: 10px;
            margin-top: 10px;
        }

        .export-buttons-container .export-button {
            ${Button.CSS_VAR_PREFIX}bg: var(--panel-accent-color);
            ${Button.CSS_VAR_PREFIX}bg-hover: var(--panel-hover-color);
            ${Button.CSS_VAR_PREFIX}color: white;
            flex: 1;
            display: block;
            border: none;
            border-radius: 4px;
            padding: 8px 12px;
            margin-top: 10px;
            cursor: pointer;
            font-size: 14px;
            width: 100%;
            text-align: center;
            transition: background-color var(--transition-speed) var(--transition-easing);
        }

        .downloaded {
            background-color: #4CAF50;
            transition: background-color var(--transition-speed) var(--transition-easing);
        }

       .expand-progress-container {
            margin-top: 10px;
            padding: 5px;
            border-radius: 4px;
        }

        .userscripts-slider-input::-webkit-slider-thumb {
            -webkit-appearance: none !important;
            appearance: none !important;
            width: 18px !important;
            height: 18px !important;
            border-radius: 50% !important;
            background-color: #008080 !important;
            cursor: pointer !important;
            border: none !important;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2) !important;
        }
        
        .userscripts-slider-input::-moz-range-thumb {
            width: 18px !important;
            height: 18px !important;
            border-radius: 50% !important;
            background-color: #008080 !important;
            cursor: pointer !important;
            border: none !important;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2) !important;
        }
        
        .userscripts-slider-input {
            -webkit-appearance: none !important;
            appearance: none !important;
            height: 6px !important;
            border-radius: 3px !important;
            background-color: #e5e7eb !important;
            outline: none !important;
        }

        /* Select box styling */
        .delivery-method-select {
          width: 100%;
          padding: 8px 10px;
          border: 1px solid #ccc;
          border-radius: 4px;
          background-color: white;
          font-size: 14px;
          color: #333;
          cursor: pointer;
          outline: none;
          margin: 8px 0;
          appearance: none;
          -webkit-appearance: none;
          position: relative;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='%23666'%3E%3Cpath d='M7 10l5 5 5-5z'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 10px center;
        }
        
        .delivery-method-select:focus {
          border-color: var(--panel-accent-color);
        }
        
        .delivery-method-select option {
          padding: 8px;
        }
        
        .delivery-method-select option:checked {
          background-color: var(--panel-accent-color);
          color: white;
        }
    `, 'wallapop-enhanced-tools');
}