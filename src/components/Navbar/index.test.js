import React from 'react';
import Navbar from './';
import renderer from 'react-test-renderer';

test('Navbar renders correctly', () => {
  const component = renderer.create(<Navbar />);
  let tree = component.toJSON();
  expect(tree).toMatchSnapshot();
});
