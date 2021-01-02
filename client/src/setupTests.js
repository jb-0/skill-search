import Enzyme from 'enzyme'
import Adapter from 'enzyme-adapter-react-16'
import fetchMock from 'jest-fetch-mock';
import 'jest-canvas-mock';

Enzyme.configure({ adapter: new Adapter() })

fetchMock.enableMocks();

jest.mock('chart.js', () => jest.fn().mockImplementation(() => null));