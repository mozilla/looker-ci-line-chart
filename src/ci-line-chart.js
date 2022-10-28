import {
  Chart,
  LineElement,
  PointElement,
  LineController,
  LinearScale,
  CategoryScale,
  LogarithmicScale,
  TimeScale,
  Filler,
  Legend,
  Title,
  Tooltip,
  SubTitle
} from 'chart.js';
import 'chartjs-adapter-luxon';

Chart.register(
  LineElement,
  PointElement,
  LineController,
  LinearScale,
  CategoryScale,
  LogarithmicScale,
  TimeScale,
  Filler,
  Legend,
  Title,
  Tooltip,
  SubTitle
);

const vis = {
  options: {
    // Plot
    field_x: {
      section: "Plot",
      type: "string",
      label: "X Axis Field",
      display: "select",
      order: 0,
      values: [],
    },
    field_y: {
      section: "Plot",
      type: "string",
      label: "Y Axis Field",
      display: "select",
      order: 1,
      values: [],
    },
    log_scale: {
      section: "Plot",
      type: "boolean",
      label: "Use Logarithmic Scale",
      display: "toggle",
      order: 2,
      default: false,
    },
    ci_lower: {
      section: "Plot",
      type: "string",
      label: "Confidence Interval Lower",
      display: "select",
      order: 3,
      values: [],
    },
    ci_upper: {
      section: "Plot",
      type: "string",
      label: "Confidence Interval Upper",
      display: "select",
      order: 4,
      values: [],
    },
    show_grid: {
      section: "Plot",
      type: "boolean",
      label: "Show vertical grid lines",
      display: "toggle",
      order: 5,
      default: false,
    },
    y_bound_min: {
      section: "Plot",
      type: "number",
      label: "Minimum Y Value",
      display: "number",
      order: 6,
      display_size: "half",
    },
    y_bound_max: {
      section: "Plot",
      type: "number",
      label: "Maximum Y Value",
      display: "number",
      order: 7,
      display_size: "half",
    },
    // Series
    color_palette: {
      section: "Series",
      type: "array",
      label: "Color Palette",
      display: "colors",
      default: [ // these are the defaults from Looker
        '#3FE1B0',
        '#0060E0',
        '#9059FF',
        '#B933E1',
        '#FF2A8A',
        '#FF505F',
        '#FF7139',
        '#FFA537',
        '#005E5D',
        '#073072',
        '#7F165B',
        '#A7341F',
     ]
    }
  },

  create (element, config) {
    // TODO: styles in here?
    // TODO: move some general setup to this fn?

    
  },

  updateAsync (data, element, config, queryResponse, details, done) {
    this.clearErrors();

    // Throw some errors and exit if the shape of the data isn't what this chart needs.
    // TODO: more error checks
    if (queryResponse.fields.dimensions.length === 0) {
      this.addError({
        title: "No Dimensions",
        message: "This chart requires dimensions.",
      });
      return;
    }
    if (queryResponse.fields.measures.length < 3) {
      this.addError({
        title: "Not Enough Measures",
        message: "This chart requires 3+ measures (value and lower/upper CI bounds).",
      });
      return;
    }

    // Fill in select options based on fields available
    const dim_options = queryResponse.fields.dimensions.map(d => ({ [`${d.label_short}`]: `${d.name}` }));
    const measure_options = queryResponse.fields.measures.map(d => ({ [`${d.label_short}`]: `${d.name}` }));

    let pivots = [];
    let pivotFieldNames = new Set();
    if ('pivots' in queryResponse) {
      pivots = queryResponse.pivots.map(d => ({ [`${d.label_short}`]: `${d.name}` }));
    }

    if (pivots.length === 0) {
      // placeholder for when no pivots are used
      pivotFieldNames.add("NONE");
    }

    // create map from full name to friendly/short name for fields
    const optionsToFriendly = {};
    [...queryResponse.fields.dimensions, ...queryResponse.fields.measures].forEach(d => {
      optionsToFriendly[d.name] = d.label_short;
    });

    // setup config options and default values
    this.options.field_x.values = [...dim_options, ...measure_options];
    this.options.field_y.values = measure_options;
    this.options.ci_lower.values = measure_options;
    this.options.ci_upper.values = measure_options;

    if (config.y_bound_min && config.y_bound_max && config.y_bound_min >= config.y_bound_max) {
      this.addError({
        title: "Check Config",
        message: "Invalid Y Axis bounds (Min >= Max).",
      });
    }

    // TODO: dynamically get the correct fields from the data
    // 	(the user should be able to select these fields from the Gear menu
    //	 and we retrieve them here)
    if (!(config.field_x && config.field_y && config.ci_lower && config.ci_upper)) {
      // console.log('CONFIG ERROR', config);
      // this.addError({
        //   title: "Check Config",
        //   message: "This chart requires fields to be configured.",
      // });
      // return;
      config.field_x = config.field_x || Object.values(dim_options[0])[0];
      config.field_y = config.field_y || Object.values(measure_options[0])[0];
      config.ci_lower = config.ci_lower || Object.values(measure_options[1])[0];
      config.ci_upper = config.ci_upper || Object.values(measure_options[2])[0];
    }
    const xObj = [...queryResponse.fields.dimensions, ...queryResponse.fields.measures].filter(f => f.name === config.field_x);
    let xType = "";
    if (xObj.length > 0) {
      xType = xObj[0].type;
    }
    const xIsDate = xType.indexOf("date") >= 0 || xType.indexOf("time") >= 0;

    const d3data = data.flatMap((row) => {
      if (pivots.length === 0) {
        return {
          x: xIsDate ? new Date(row[config.field_x].value) : row[config.field_x].value,
          y: row[config.field_y].value,
          CI_left: row[config.ci_lower].value,
          CI_right: row[config.ci_upper].value,
          pivot: "NONE",
        }
      } else {
        let pivotEntries = Object.keys(row[config.field_y]);
        return pivotEntries.map(p => {
          pivotFieldNames.add(p);
          return {
            x: xIsDate ? new Date(row[config.field_x].value) : row[config.field_x].value,
            y: row[config.field_y][p].value,
            CI_left: row[config.ci_lower][p].value,
            CI_right: row[config.ci_upper][p].value,
            pivot: p
          }
        });
      }
    });

    // add color change option for every line
    Array.from(pivotFieldNames).forEach((group, idx) => {
      if (typeof this.options.color_palette.default !== 'undefined') {
        const defaultColor = this.options.color_palette.default[idx % this.options.color_palette.default.length];
        const label_text = group == 'NONE' ? 'Series' : group;

        this.options[group] = {
          section: "Series",
          type: "string",
          label: label_text,
          display: "color",
          default: defaultColor
        };
      }
    });

    // register options with parent page to update visConfig
    this.trigger('registerOptions', this.options);

    // setup canvas
    const width = element.clientWidth;
    const height = element.clientHeight;

    const ctxElem = `<canvas id="vis-chart" width="${width}" height="${height}"></canvas>`;
    element.innerHTML = ctxElem;
    this.ctx = document.getElementById('vis-chart');

    const xConfig = xIsDate ? {
      type: 'time',
      time: {
        tooltipFormat: 'DD',
        unit: 'day',
        round: 'day',
      },
      title: {
        display: true,
        text: optionsToFriendly[config.field_x]
      },
      grid: {
        display: config.show_grid
      },
    } : {
      type: 'linear',
      title: {
        display: true,
        text: optionsToFriendly[config.field_x]
      },
      grid: {
        display: config.show_grid
      },
    };

    const yConfig = (config.y_bound_min || config.y_bound_max) ? {
      min: config.y_bound_min,
      max: config.y_bound_max,
      type: config.log_scale ? 'logarithmic' : 'linear',
    } : {
      type: config.log_scale ? 'logarithmic' : 'linear',
    };

    // Setup lines for each group
    const cfg = {
      type: 'line',
      parsing: false,
      normalized: true,
      data: {
        datasets: []
      },
      options: {
        scales: {
          x: xConfig,
          y: yConfig,
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              boxWidth: 16,
              boxHeight: 2
            }
          }
        },
        interaction: {
          mode: 'index', // show all Y values for current X
          intersect: false // hover anywhere to show tooltip (not just on a point)
        },
        animation: false,
        hover: {
          animationDuration: 0 // duration of animations when hovering an item
        },
        responsiveAnimationDuration: 0
      },
    };

    Array.from(pivotFieldNames).forEach((group, idx) => {
      // Filter data to the current group
      const groupData = d3data.filter((d) => d.pivot === group);
      const groupLabel = group !== 'NONE' ? ` - ${group}` : '';

      cfg.data.datasets.push({
        label: `Lower ${groupLabel}`,
        data: groupData,
        fill: (idx * 3) + 1, // should point to index 1 **of this group**
        parsing: {
          yAxisKey: 'CI_left'
        },
        backgroundColor: `${config[group]}33`,
        borderColor: config[group],
        elements: {
          line: {
            borderWidth: 0
          },
          point: {
            radius: 0,
            hitRadius: 4,
          }
        },
        spanGaps: true
      });
      cfg.data.datasets.push({
        label: `${optionsToFriendly[config.field_y]} ${groupLabel}`,
        data: groupData,
        fill: false,
        parsing: {
          yAxisKey: 'y'
        },
        borderColor: config[group],
        backgroundColor: config[group],
        elements: {
          line: {
            borderWidth: 2
          },
          point: {
            radius: 0,
            hitRadius: 4,
          }
        },
        spanGaps: true
      });
      cfg.data.datasets.push({
        label: `Upper ${groupLabel}`,
        data: groupData,
        fill: (idx * 3) + 1, // should point to index 1 **of this group**
        parsing: {
          yAxisKey: 'CI_right'
        },
        backgroundColor: `${config[group]}33`,
        borderColor: config[group],
        elements: {
          line: {
            borderWidth: 0
          },
          point: {
            radius: 0,
            hitRadius: 4,
          }
        },
        spanGaps: true
      });
    });

    const myChart = new Chart(this.ctx, cfg);

    done();
  },
};

looker.plugins.visualizations.add(vis);
