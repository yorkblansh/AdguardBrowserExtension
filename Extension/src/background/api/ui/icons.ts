/**
 * @file
 * This file is part of AdGuard Browser Extension (https://github.com/AdguardTeam/AdguardBrowserExtension).
 *
 * AdGuard Browser Extension is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * AdGuard Browser Extension is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with AdGuard Browser Extension. If not, see <http://www.gnu.org/licenses/>.
 */
import browser from 'webextension-polyfill';

import { SettingOption } from '../../schema';
import { settingsStorage } from '../../storages';
import { getIconImageData } from '../../../common/api/extension';
import { logger } from '../../../common/logger';
import { RulesLimitsService } from '../../services/rules-limits/mv3/rules-limits';

import { FrameData } from './frames';
import { promoNotificationApi } from './promo-notification';

/**
 * The Icons API is responsible for setting the icon that corresponds
 * to the current state of the background extension in the specified tab.
 */
export class IconsApi {
    /**
     * Updates current extension icon for specified tab.
     *
     * @param tabId Tab's id.
     * @param frameData The information from {@link FrameData} is needed
     * to estimate the current status of the background extension
     * in the specified tab.
     * @param frameData.documentAllowlisted Is website allowlisted.
     * @param frameData.applicationFilteringDisabled Is app filtering disabled globally.
     * @param frameData.totalBlockedTab Number of blocked requests.
     */
    static async updateTabIcon(
        tabId: number,
        {
            documentAllowlisted,
            applicationFilteringDisabled,
            totalBlockedTab,
        }: FrameData,
    ): Promise<void> {
        let icon: Record<string, string>;
        let badge: string;
        let badgeColor = '#555';

        // Icon is gray only if application is disabled or site is in exception
        const disabled = documentAllowlisted || applicationFilteringDisabled;

        let blocked: number;

        if (!disabled && !settingsStorage.get(SettingOption.DisableShowPageStats)) {
            blocked = totalBlockedTab;
        } else {
            blocked = 0;
        }

        const isWarning = RulesLimitsService.areFilterLimitsExceeded();

        try {
            if (isWarning) {
                icon = {
                    '19': browser.runtime.getURL('assets/icons/warning-19.png'),
                    '38': browser.runtime.getURL('assets/icons/warning-38.png'),
                };
            } else if (disabled) {
                icon = {
                    '19': browser.runtime.getURL('assets/icons/off-19.png'),
                    '38': browser.runtime.getURL('assets/icons/off-38.png'),
                };
            } else {
                icon = {
                    '19': browser.runtime.getURL('assets/icons/on-19.png'),
                    '38': browser.runtime.getURL('assets/icons/on-38.png'),
                };
            }

            if (blocked === 0) {
                badge = '';
            } else if (blocked > 99) {
                badge = '\u221E';
            } else {
                badge = String(blocked);
            }

            // If there's an active notification, indicate it on the badge
            const notification = await promoNotificationApi.getCurrentNotification();
            if (notification) {
                badge = notification.badgeText || badge;
                badgeColor = notification.badgeBgColor || badgeColor;

                if (disabled) {
                    if (notification?.icons?.ICON_GRAY) {
                        icon = notification.icons.ICON_GRAY;
                    }
                } else if (notification?.icons?.ICON_GREEN) {
                    icon = notification.icons.ICON_GREEN;
                }
            }

            // TODO abstract to two different modules for mv3 and mv2 extensions
            const browserAction = __IS_MV3__ ? browser.action : browser.browserAction;

            await browserAction.setIcon({ tabId, imageData: await getIconImageData(icon) });

            if (badge) {
                await browserAction.setBadgeText({ tabId, text: badge });
                await browserAction.setBadgeBackgroundColor({ tabId, color: badgeColor });
            }
        } catch (e) {
            logger.info('Failed to update tab icon:', e);
        }
    }
}
