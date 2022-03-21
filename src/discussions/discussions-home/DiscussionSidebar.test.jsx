import { render, screen } from '@testing-library/react';
import MockAdapter from 'axios-mock-adapter';
import { act } from 'react-dom/test-utils';
import { IntlProvider } from 'react-intl';
import { Context as ResponsiveContext } from 'react-responsive';
import { MemoryRouter } from 'react-router';
import { Factory } from 'rosie';

import { initializeMockApp } from '@edx/frontend-platform';
import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';
import { AppProvider } from '@edx/frontend-platform/react';

import { initializeStore } from '../../store';
import { threadsApiUrl } from '../posts/data/api';
import DiscussionSidebar from './DiscussionSidebar';

import '../posts/data/__factories__';

let store;
const courseId = 'course-v1:edX+DemoX+Demo_Course';
let axiosMock;

function renderComponent(displaySidebar = true, location = `/${courseId}/`) {
  return render(
    <IntlProvider locale="en">
      <ResponsiveContext.Provider value={{ width: 1280 }}>
        <AppProvider store={store}>
          <MemoryRouter initialEntries={[location]}>
            <DiscussionSidebar data-test- displaySidebar={displaySidebar} />
          </MemoryRouter>
        </AppProvider>
      </ResponsiveContext.Provider>
    </IntlProvider>,
  );
}

describe('DiscussionSidebar', () => {
  beforeEach(async () => {
    initializeMockApp({
      authenticatedUser: {
        userId: 3,
        username: 'abc123',
        administrator: true,
        roles: [],
      },
    });

    store = initializeStore({
      blocks: { blocks: { 'test-usage-key': { topics: ['some-topic-2', 'some-topic-0'] } } },
    });
    Factory.resetAll();
    axiosMock = new MockAdapter(getAuthenticatedHttpClient());
  });
  afterEach(() => {
    axiosMock.reset();
  });

  test('component visible if displaySidebar == true', async () => {
    renderComponent(true);
    const element = await screen.findByTestId('sidebar');
    expect(element).not.toHaveClass('d-none');
  });

  test('component invisible by default', async () => {
    renderComponent(false);
    const element = await screen.findByTestId('sidebar');
    expect(element).toHaveClass('d-none');
  });

  test('User with some topics should be redirected to "My Posts"', async () => {
    axiosMock.onGet(threadsApiUrl)
      .reply(({ params }) => [200, Factory.build('threadsResult', {}, {
        threadAttrs: { title: `Thread by ${params.author || 'other users'}` },
      })]);
    renderComponent();
    await act(async () => expect(await screen.findAllByText('Thread by abc123')).toBeTruthy());
    expect(screen.queryByText('Thread by other users')).not.toBeInTheDocument();
  });
  test('User with no posts should be redirected to "All Posts"', async () => {
    axiosMock.onGet(threadsApiUrl)
      .reply(({ params }) => [200, Factory.build('threadsResult', {}, {
        count: params.author ? 0 : 3,
        threadAttrs: { title: `Thread by ${params.author || 'other users'}` },
      })]);
    renderComponent();
    await act(async () => expect(await screen.findAllByText('Thread by other users')).toBeTruthy());
    expect(screen.queryByText('Thread by abc123')).not.toBeInTheDocument();
  });
});