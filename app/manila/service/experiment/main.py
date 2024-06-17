import pandas as pd
import argparse
import os
import pickle

from experiment import run_exp

if __name__ == '__main__':
    parser = argparse.ArgumentParser(
        description='Experiment file for fairness testing')
    parser.add_argument('-d', '--dataset', type=str,
                        help='Required argument: relative path of the dataset to process')
    args = parser.parse_args()
    
    {%include "components/data_loader.jinja"%}

    model, report = run_exp(data)
    os.makedirs('ris', exist_ok=True)
    dir_name = os.path.basename(os.path.dirname(__file__))
    {%if tabular%}
    report.round(3).to_csv(os.path.join('ris',f'report_{dir_name}.csv'))
    {%endif%}
    {%if chart%}
    chart = Charts(report, os.path.join('ris','chart_'+dir_name))
    {%if bar_plot%}
    chart.make_barplot()
    {%endif%}
    {%if line_plot%}
    chart.make_lineplot()
    {%endif%}
    {%if strip_plot%}
    chart.make_stripplot()
    {%endif%}
    {%if box_plot%}
    chart.make_boxplot()
    {%endif%}
    {%if point_plot%}
    chart.make_pointplot()
    {%endif%}
    {%endif%}
    {%if fairness%}
    model_name = f"{report.loc[0,'model']}_{report.loc[0,'fairness_method']}"
    {%else%}
    model_name = f"{report.loc[0,'model']}"
    {%endif%}
    pickle.dump(model, open(os.path.join('ris',model_name+'_'+dir_name+'.pkl'), 'wb'))
