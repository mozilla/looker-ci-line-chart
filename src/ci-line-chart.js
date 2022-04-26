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
      label: "Use Logarithmic Scale?",
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

    this.options.field_x.values = [...dim_options, ...measure_options];
    this.options.field_y.values = measure_options;
    this.options.ci_lower.values = measure_options;
    this.options.ci_upper.values = measure_options;
    // register options with parent page to update visConfig
    this.trigger('registerOptions', this.options);

    // TODO: dynamically get the correct fields from the data
    // 	(the user should be able to select these fields from the Gear menu
    //	 and we retrieve them here)
    if (!(config.field_x && config.field_y && config.ci_lower && config.ci_upper)) {
      this.addError({
        title: "Check Config",
        message: "This chart requires fields to be configured.",
      });
      return;
    }

    const d3data = data.flatMap((row) => {
      if (pivots.length === 0) {
        return {
          x: new Date(row[config.field_x].value),
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
            x: new Date(row[config.field_x].value),
            y: row[config.field_y][p].value,
            CI_left: row[config.ci_lower][p].value,
            CI_right: row[config.ci_upper][p].value,
            pivot: p
          }
        });
      }
    });

    // setup canvas
    const width = element.clientWidth;
    const height = element.clientHeight;

    const ctxElem = `<canvas id="vis-chart" width="${width}" height="${height}"></canvas>`;
    element.innerHTML = ctxElem;
    this.ctx = document.getElementById('vis-chart');

    // Setup lines for each group
    const cfg = {
      type: 'line',
      data: {
        datasets: []
      },
      options: {
        scales: {
          x: {
            type: 'time',
            time: {
              tooltipFormat: 'DD T'
            },
            title: {
              display: true,
              text: optionsToFriendly[config.field_x]
            }
          },
          y: {
            type: config.log_scale ? 'logarithmic' : 'linear',
          },
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
        }
      }
    };

    Array.from(pivotFieldNames).forEach((group, idx) => {
      // Filter data to the current group
      const groupData = d3data.filter((d) => d.pivot === group);

      cfg.data.datasets.push({
        label: `Lower-${group}`,
        data: groupData,
        fill: 1,
        parsing: {
          yAxisKey: 'CI_left'
        },
        borderColor: idx === 0 ? 'rgba(0,0,200,1)' : 'rgba(200,0,0,1)',
        backgroundColor: idx === 0 ? 'rgba(0,0,200,0.5)' : 'rgba(200,0,0,0.5)',
        elements: {
          line: {
            borderWidth: 0
          },
          point: {
            radius: 0,
            hitRadius: 4,
          }
        }
      });
      cfg.data.datasets.push({
        label: `${optionsToFriendly[config.field_y]}-${group}`,
        data: groupData,
        fill: false,
        parsing: {
          yAxisKey: 'y'
        },
        borderColor: idx === 0 ? 'rgba(0,0,200,1)' : 'rgba(200,0,0,1)',
        backgroundColor: idx === 0 ? 'rgba(0,0,200,0.5)' : 'rgba(200,0,0,0.5)',
        elements: {
          line: {
            borderWidth: 2
          },
          point: {
            radius: 0,
            hitRadius: 4,
          }
        }
      });
      cfg.data.datasets.push({
        label: `Upper-${group}`,
        data: groupData,
        fill: 1,
        parsing: {
          yAxisKey: 'CI_right'
        },
        borderColor: idx === 0 ? 'rgba(0,0,200,1)' : 'rgba(200,0,0,1)',
        backgroundColor: idx === 0 ? 'rgba(0,0,200,0.5)' : 'rgba(200,0,0,0.5)',
        elements: {
          line: {
            borderWidth: 0
          },
          point: {
            radius: 0,
            hitRadius: 4,
          }
        }
      });
    });

    const myChart = new Chart(this.ctx, cfg);

    done();
  },
};

looker.plugins.visualizations.add(vis);
