import { useDeps, composeAll, composeWithTracker, compose } from 'mantra-core';
import loading from '/client/modules/core/components/loading';
import StackSSL from '../components/stack_ssl';

export const composer = ({ context, id }, onData) => {
  const { Meteor, Collections } = context();
  const { Stacks, Services, Settings } = Collections;

  if (Meteor.subscribe('stack-page', id).ready()) {
    const stack = Stacks.findOne();
    const services = Services.find({}, { sort: { name: 1 }}).fetch();
    const settings = Settings.findOne();
    onData(null, { stack, services, settings });
  }
};

export const depsMapper = (context, actions) => ({
  context: () => context,
  deleteCert: actions.stacks.deleteCert
});

export default composeAll(
  composeWithTracker(composer, loading),
  useDeps(depsMapper)
)(StackSSL);
