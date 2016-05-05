"""
KBase job class
"""
__author__ = "Bill Riehl <wjriehl@lbl.gov>"

import biokbase.narrative.clients as clients
import specmanager as specmanager
import biokbase.narrative.widgetmanager as widgetmanager
from .method_util import (
    system_variable,
    map_inputs_from_state
)
from biokbase.narrative.common.generic_service_calls import (
    get_sub_path
)
from biokbase.narrative.common.kbjob_manager import KBjobManager
import json

class Job ():
    job_id = None
    method_id = None
    method_version = None
    cell_id = None

    def __init__(self, job_id, method_id, tag='release', method_version=None, cell_id=None):
        """
        Initializes a new Job with a given id, method id, and method method_version.
        The method_id and method_version should both align with what's available in
        the Narrative Method Store service.
        """
        self.job_id = job_id
        self.method_id = method_id
        self.method_version = method_version
        self.tag = tag
        self.cell_id = cell_id
        self.job_manager = KBjobManager()

    @classmethod
    def from_state(Job, state, tag='release', cell_id=None):
        return Job(state['job_id'],
                   state['original_app']['steps'][0]['method_spec_id'],
                   tag=tag,
                   method_version=state['original_app']['steps'][0]['service'].get('service_version', None),
                   cell_id=cell_id)

    def info(self):
        spec = self.method_spec()
        state = self.full_state()
        print "Method name (id): {}".format(spec['info']['name'], self.method_id)
        print "Version: {}".format(spec['info']['ver'])
        print "Status: {}".format(state['job_state'])
        inputs = map_inputs_from_state(state, spec)
        print "Inputs:\n------"
        for p in inputs:
            print "{}: {}".format(p, inputs[p])

    def method_spec(self):
        return specmanager.get_manager().get_method_spec(self.method_id, self.tag)

    def status(self):
        return self.full_state()['job_state']

    def full_state(self):
        """
        Queries the job service to see the status of the current job.
        Returns a <something> stating its status. (string? enum type? different traitlet?)
        """
        return clients.get('job_service').check_app_state(self.job_id)

    def results(self):
        """
        For a complete job, returns the job results.
        An incomplete job throws an exception
        """
        state = self.full_state()
        if state['job_state'] == 'completed' and state['step_outputs']:
            # prep the output widget params
            widget_params = dict()
            method_spec = self.method_spec()
            for out_param in method_spec['behavior'].get('kb_service_output_mapping', []):
                p_id = out_param['target_property']
                if 'narrative_system_variable' in out_param:
                    widget_params[p_id] = system_variable(out_param['narrative_system_variable'])
                elif 'constant_value' in out_param:
                    widget_params[p_id] = out_param['constant_value']
                elif 'input_parameter' in out_param:
                    widget_params[p_id] = state['original_app']['steps'][0]['input_values'][0][out_param['input_parameter']]
                elif 'service_method_output_path' in out_param:
                    widget_params[p_id] = get_sub_path(json.loads(state['step_outputs'][self.method_id]), out_param['service_method_output_path'], 0)

            output_widget = method_spec.get('widgets', {}).get('output', 'kbaseDefaultNarrativeOutput')
            return widgetmanager.get_manager().show_output_widget(output_widget, tag=self.tag, **widget_params)

        else:
            return "Job is incomplete! It has status '{}'".format(state['job_state'])

    def log(self):
        pass

    def cancel(self):
        """
        Cancels a currently running job. Fails silently if there's no job running.
        """
        pass

    def is_finished(self):
        """
        Returns True if the job is finished (in any state, including errors or cancelled),
        False if its running/queued.
        """
        status = self.status()
        return status.lower() in ['completed', 'error', 'suspend']