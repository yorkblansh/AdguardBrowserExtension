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

import path from 'path';

import CopyWebpackPlugin from 'copy-webpack-plugin';
import { merge } from 'webpack-merge';
import { Configuration } from 'webpack';

import { genMv2CommonConfig } from '../webpack.common-mv2';
import { CHROMIUM_DEVTOOLS_ENTRIES, CHROMIUM_DEVTOOLS_PAGES_PLUGINS } from '../webpack.common';
import { updateManifestBuffer } from '../../helpers';
import { BUILD_ENV } from '../../constants';
import { type BrowserConfig } from '../common-constants';

import { edgeManifest } from './manifest.edge';

export const genEdgeConfig = (browserConfig: BrowserConfig) => {
    const commonConfig = genMv2CommonConfig(browserConfig);

    if (!commonConfig?.output?.path) {
        throw new Error('commonConfig.output.path is undefined');
    }

    const edgeConfig: Configuration = {
        entry: CHROMIUM_DEVTOOLS_ENTRIES,
        output: {
            path: path.join(commonConfig.output.path, browserConfig.buildDir),
        },
        plugins: [
            new CopyWebpackPlugin({
                patterns: [
                    {
                        from: path.resolve(__dirname, '../manifest.common.json'),
                        to: 'manifest.json',
                        transform: (content) => updateManifestBuffer(
                            BUILD_ENV,
                            browserConfig.browser,
                            content,
                            edgeManifest,
                        ),
                    },
                    {
                        context: 'Extension',
                        from: 'filters/edge',
                        to: 'filters',
                    },
                ],
            }),
            ...CHROMIUM_DEVTOOLS_PAGES_PLUGINS,
        ],
    };

    return merge(commonConfig, edgeConfig);
};
