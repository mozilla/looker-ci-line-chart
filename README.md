# Looker Line Chart with Confidence Interval

> Work in progress

## Development

Install dependencies: `npm install`

To build the visualization plugin run: `npm run build`

Any changes to the source code will be automatically detected.

## Testing

To test local changes run `npm run start`

All changes made locally will be reflected when selecting the _Line Chart with Confidence Interval - Development_ visualization.

This visualization has been configured by adding a new _Visualization_ through the Admin interface and setting the entry point to `https://localhost:3443/ciLineChart.js`

## Installation

To install this plugin in Looker for use in production, go to _Marketplace_ → _Manage_ → _Install via git URL_:

* Git Repository URL: `https://github.com/mozilla/looker-ci-line-chart.git`
* Git Commit SHA: `main`

## Updating

Whenever changes have been pushed to the git repository, the plugin needs to be manually updated in Looker.
Go to _Marketplace_ → _Manage_ and click on the settings icon of the installed plugin. Click _Update_ to install updates.
