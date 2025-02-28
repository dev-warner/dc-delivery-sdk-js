import MockAdapter from 'axios-mock-adapter';
import { expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
use(chaiAsPromised);

import { GetContentItem } from './GetContentItem';

import {
  NO_RESULTS,
  SINGLE_RESULT,
  SINGLE_RESULT_WITH_IMAGE,
  SINGLE_LEGACY_RESULT_WITH_IMAGE,
  SINGLE_LEGACY_RESULT,
  NESTED_CONTENT
} from '../test/fixtures';
import { ContentMapper } from '../mapper/ContentMapper';
import { ContentMeta } from '../model/ContentMeta';
import Axios from 'axios';

function createCoordinator(
  accountName: string,
  locale?: string
): [MockAdapter, GetContentItem] {
  const mocks = new MockAdapter(null);
  const config = { account: accountName, adaptor: mocks.adapter(), locale };
  const networkClient = Axios.create({
    baseURL: 'https://c1.adis.ws',
    adapter: mocks.adapter()
  });

  const client = new GetContentItem(
    config,
    networkClient,
    new ContentMapper(config)
  );
  return [mocks, client];
}

describe('GetContentItem', () => {
  context('getUrl', () => {
    it('should url encode account name', () => {
      const [, coordinator] = createCoordinator('test account');
      expect(coordinator.getUrl({})).to.contain('test%20account');
    });

    it('should JSON stringify query', () => {
      const [, coordinator] = createCoordinator('test');
      expect(
        coordinator.getUrl({
          'sys.iri':
            'http://content.cms.amplience.com/2c7efa09-7e31-4503-8d00-5a150ff82f17'
        })
      ).to.eq(
        '/cms/content/query?query=%7B%22sys.iri%22%3A%22http%3A%2F%2Fcontent.cms.amplience.com%2F2c7efa09-7e31-4503-8d00-5a150ff82f17%22%7D&fullBodyObject=true&scope=tree&store=test'
      );
    });

    it('should append locale if provided', () => {
      const [, coordinator] = createCoordinator('test', 'en-GB');
      expect(
        coordinator.getUrl({
          'sys.iri':
            'http://content.cms.amplience.com/2c7efa09-7e31-4503-8d00-5a150ff82f17'
        })
      ).to.eq(
        '/cms/content/query?query=%7B%22sys.iri%22%3A%22http%3A%2F%2Fcontent.cms.amplience.com%2F2c7efa09-7e31-4503-8d00-5a150ff82f17%22%7D&fullBodyObject=true&scope=tree&store=test&locale=en-GB'
      );
    });
  });

  context('processResponse', () => {
    const [, coordinator] = createCoordinator('test');

    it('should return an empty array if no results were found', () => {
      const contentItems = coordinator.processResponse(NO_RESULTS);
      expect(contentItems.length).to.eq(0);
    });

    it('should return content item from results', () => {
      const contentItems = coordinator.processResponse(SINGLE_RESULT);
      expect(contentItems.length).to.eq(1);
      expect(contentItems[0]).to.deep.eq({
        _meta: {
          deliveryId: '2c7efa09-7e31-4503-8d00-5a150ff82f17',
          name: 'name',
          schema:
            'https://raw.githubusercontent.com/techiedarren/dc-examples/master/content-types/containers/page.json'
        }
      });
    });

    it('should upgrade legacy content item', () => {
      const contentItems = coordinator.processResponse(SINGLE_LEGACY_RESULT);
      expect(contentItems.length).to.eq(1);
      expect(contentItems[0]).to.deep.eq({
        _meta: {
          deliveryId: '2c7efa09-7e31-4503-8d00-5a150ff82f17',
          name: 'Title',
          schema:
            'https://raw.githubusercontent.com/techiedarren/dc-examples/master/content-types/containers/page.json'
        },
        _title: 'Title'
      });
    });

    it('should inline media links', () => {
      const contentItems = coordinator.processResponse(
        SINGLE_RESULT_WITH_IMAGE
      );
      expect(contentItems.length).to.eq(1);
      expect(contentItems[0]).to.deep.eq({
        _meta: {
          deliveryId: '2c7efa09-7e31-4503-8d00-5a150ff82f17',
          schema:
            'https://raw.githubusercontent.com/techiedarren/dc-examples/master/content-types/containers/page.json'
        },
        image: {
          _meta: {
            schema:
              'http://bigcontent.io/cms/schema/v1/core#/definitions/image-link'
          },
          defaultHost: 'i1.adis.ws',
          endpoint: 'dcdemo',
          id: 'ddf4eac9-7822-401c-97d6-b1be985e421c',
          mediaType: 'image',
          name: 'shutterstock_749703970'
        }
      });
    });

    it('should upgrade legacy media links', () => {
      const contentItems = coordinator.processResponse(
        SINGLE_LEGACY_RESULT_WITH_IMAGE
      );
      expect(contentItems.length).to.eq(1);
      expect(contentItems[0]).to.deep.eq({
        _meta: {
          deliveryId: '2c7efa09-7e31-4503-8d00-5a150ff82f17',
          schema:
            'https://raw.githubusercontent.com/techiedarren/dc-examples/master/content-types/containers/page.json'
        },
        image: {
          _meta: {
            schema:
              'http://bigcontent.io/cms/schema/v1/core#/definitions/image-link'
          },
          defaultHost: 'i1.adis.ws',
          endpoint: 'dcdemo',
          id: 'ddf4eac9-7822-401c-97d6-b1be985e421c',
          mediaType: 'image',
          name: 'shutterstock_749703970'
        }
      });
    });

    it('should inline content links', () => {
      const contentItems = coordinator.processResponse(NESTED_CONTENT);
      expect(contentItems.length).to.eq(1);

      expect(contentItems[0]).to.deep.eq({
        _meta: {
          deliveryId: '2c7efa09-7e31-4503-8d00-5a150ff82f17',
          schema:
            'https://raw.githubusercontent.com/techiedarren/dc-examples/master/content-types/containers/page.json'
        },
        contentSlots: [
          {
            _meta: {
              deliveryId: '286f3e8e-f088-4956-92c6-a196d7e16c4e',
              schema:
                'https://raw.githubusercontent.com/techiedarren/dc-examples/master/content-types/blocks/image-block.json',
              name: 'fathers-day-pre-sale'
            },
            image: {
              _meta: {
                schema:
                  'http://bigcontent.io/cms/schema/v1/core#/definitions/image-link'
              },
              id: 'ddf4eac9-7822-401c-97d6-b1be985e421c',
              name: 'shutterstock_749703970',
              endpoint: 'dcdemo',
              defaultHost: 'i1.adis.ws',
              mediaType: 'image'
            },
            mobileAspectRatio: {
              w: 1,
              h: 1,
              _meta: {
                schema:
                  'https://raw.githubusercontent.com/techiedarren/dc-examples/master/content-types/mixins/aspect-ratio.json'
              }
            },
            aspectRatio: {
              w: 5,
              h: 2,
              _meta: {
                schema:
                  'https://raw.githubusercontent.com/techiedarren/dc-examples/master/content-types/mixins/aspect-ratio.json'
              }
            }
          }
        ]
      });
    });
  });

  context('getContentItem', () => {
    let mocks: MockAdapter;
    let coordinator: GetContentItem;

    beforeEach(() => {
      [mocks, coordinator] = createCoordinator('test');
    });

    it('should reject if content item not found', done => {
      mocks
        .onGet(
          '/cms/content/query?query=%7B%22sys.iri%22%3A%22http%3A%2F%2Fcontent.cms.amplience.com%2F2c7efa09-7e31-4503-8d00-5a150ff82f17%22%7D&fullBodyObject=true&scope=tree&store=test'
        )
        .reply(200, NO_RESULTS);
      expect(
        coordinator.getContentItem('2c7efa09-7e31-4503-8d00-5a150ff82f17')
      ).to.eventually.rejected.and.notify(done);
    });

    it('should resolve if content item is found', done => {
      mocks
        .onGet(
          '/cms/content/query?query=%7B%22sys.iri%22%3A%22http%3A%2F%2Fcontent.cms.amplience.com%2F2c7efa09-7e31-4503-8d00-5a150ff82f17%22%7D&fullBodyObject=true&scope=tree&store=test'
        )
        .reply(200, SINGLE_RESULT);

      const response = coordinator
        .getContentItem('2c7efa09-7e31-4503-8d00-5a150ff82f17')
        .then(x => x.toJSON());

      expect(response)
        .to.eventually.deep.eq({
          _meta: {
            deliveryId: '2c7efa09-7e31-4503-8d00-5a150ff82f17',
            name: 'name',
            schema:
              'https://raw.githubusercontent.com/techiedarren/dc-examples/master/content-types/containers/page.json'
          }
        })
        .notify(done);
    });

    it('should hydrate content items', () => {
      mocks
        .onGet(
          '/cms/content/query?query=%7B%22sys.iri%22%3A%22http%3A%2F%2Fcontent.cms.amplience.com%2F2c7efa09-7e31-4503-8d00-5a150ff82f17%22%7D&fullBodyObject=true&scope=tree&store=test'
        )
        .reply(200, SINGLE_RESULT);

      return coordinator
        .getContentItem('2c7efa09-7e31-4503-8d00-5a150ff82f17')
        .then(response => {
          expect(response.body._meta).to.be.instanceOf(ContentMeta);
        });
    });
  });
});
