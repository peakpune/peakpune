import 'package:flutter_test/flutter_test.dart';
import 'package:punepedia/l10n/strings.dart';

void main() {
  test('counts use the singular form for one', () {
    const s = S();
    expect(s.t('entriesCount', {'n': 1}), '1 entry');
    expect(s.t('entriesCount', {'n': 0}), '0 entries');
    expect(s.t('entriesCount', {'n': 7}), '7 entries');
    expect(s.t('results', {'n': 1}), '1 result');
    expect(s.t('citedIn', {'n': 1}), 'Cited in 1 entry');
  });
}
