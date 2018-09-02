import * as helmfile from './helmfile';

const yaml = `str: someString
int: 12
templated: {{ env "someVar" }}
`;

const obj = {
  str: 'someString',
  int: 12,
  templated: '{{ env "someVar" }}'
};

describe('parse', () => {
  it('parses a yaml string, encoding templates as strings', () => {
    expect(helmfile.parse(yaml)).toEqual(obj);
  });
});

describe('dump', () => {
  it(`encodes an object as yaml, restoring templates to their 'bare' form`, () => {
    expect(helmfile.dump(obj)).toEqual(yaml);
  });
});
