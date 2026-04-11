#!/usr/bin/env python3
"""
市場サマリー画像を生成してX(Twitter)にツイートするスクリプト。
毎朝GitHub Actionsから実行される。
"""
import datetime
import os
import sys
import tempfile
from zoneinfo import ZoneInfo

import japanize_matplotlib  # noqa: F401  日本語フォントを有効化
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch
import tweepy
import yfinance as yf

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fetch_news import fetch_all_news

JST = ZoneInfo("Asia/Tokyo")
WEEKDAY_JA = ['月', '火', '水', '木', '金', '土', '日']

# カラー定義
BG       = '#FAFAF8'
HEADER   = '#1B3F6E'
WHITE    = '#FFFFFF'
POSITIVE = '#27AE60'   # 上昇: 緑
NEGATIVE = '#E74C3C'   # 下落: 赤
SP_LINE  = '#27AE60'   # S&P500ライン: 緑
OIL_LINE = '#E67E22'   # 原油ライン: オレンジ
NEWS_HDR = '#1B3F6E'   # ニュースヘッダー: 濃い青
BORDER   = '#DEE2E6'
TEXT     = '#2C3E50'


def fetch_market_data() -> dict:
    """yfinanceで主要市場データ(直近90日分)を取得する"""
    symbols = {
        'S&P500': '^GSPC',
        'VIX':    '^VIX',
        'NY原油':  'CL=F',
        'ドル円':  'JPY=X',
    }
    result = {}
    for name, sym in symbols.items():
        try:
            hist = yf.Ticker(sym).history(period='90d')
            if len(hist) >= 2:
                cur  = float(hist['Close'].iloc[-1])
                prev = float(hist['Close'].iloc[-2])
                chg  = cur - prev
                pct  = chg / prev * 100
                result[name] = {
                    'value':   cur,
                    'change':  chg,
                    'pct':     pct,
                    'history': hist['Close'].tolist(),
                    'dates':   [idx.date() for idx in hist.index],
                }
        except Exception as e:
            print(f'[WARNING] {name} 取得失敗: {e}')
            result[name] = {
                'value': 0.0, 'change': 0.0, 'pct': 0.0,
                'history': [], 'dates': [],
            }
    return result


def _fmt_val(name: str, v: float) -> str:
    if name == 'S&P500':
        return f'{v:,.0f}'
    return f'{v:,.2f}'


def _fmt_chg(name: str, chg: float, pct: float) -> str:
    sign = '+' if chg >= 0 else ''
    if name == 'VIX':
        return f'{sign}{chg:.2f}'
    return f'{sign}{pct:.1f}%'


def generate_image(
    market: dict, news_titles: list, now: datetime.datetime
) -> str:
    """朝メモスタイルの市場サマリー画像を生成し、tmpファイルパスを返す"""
    fig = plt.figure(figsize=(8, 11), facecolor=BG, dpi=150)

    # ── 1. ヘッダー ────────────────────────────────────────────
    ax_h = fig.add_axes([0, 0.935, 1, 0.065])
    ax_h.set_facecolor(HEADER)
    ax_h.set_xlim(0, 1)
    ax_h.set_ylim(0, 1)
    ax_h.axis('off')
    ax_h.text(
        0.025, 0.5, 'バフェット薫 note 朝メモ',
        color=WHITE, fontsize=16, fontweight='bold', va='center',
    )
    wd = WEEKDAY_JA[now.weekday()]
    ax_h.text(
        0.975, 0.5, f'{now.month}/{now.day}（{wd}）朝 日本時間',
        color=WHITE, fontsize=10, va='center', ha='right',
    )

    # ── 2. マーケットパネル 2×2 ────────────────────────────────
    keys = ['S&P500', 'VIX', 'NY原油', 'ドル円']
    positions = [
        [0.01, 0.845, 0.48, 0.082],   # 上左
        [0.51, 0.845, 0.48, 0.082],   # 上右
        [0.01, 0.755, 0.48, 0.082],   # 下左
        [0.51, 0.755, 0.48, 0.082],   # 下右
    ]
    for key, pos in zip(keys, positions):
        d  = market.get(key, {'value': 0.0, 'change': 0.0, 'pct': 0.0})
        ax = fig.add_axes(pos)
        ax.set_facecolor(WHITE)
        ax.set_xlim(0, 1)
        ax.set_ylim(0, 1)
        ax.set_xticks([])
        ax.set_yticks([])
        for sp in ax.spines.values():
            sp.set_color(BORDER)
            sp.set_linewidth(1)

        ax.text(
            0.06, 0.55, key,
            color=TEXT, fontsize=11, fontweight='bold', va='center',
        )
        ax.text(
            0.50, 0.55, _fmt_val(key, d['value']),
            color=TEXT, fontsize=13, fontweight='bold',
            va='center', ha='center',
        )

        badge_color = POSITIVE if d['change'] >= 0 else NEGATIVE
        badge = FancyBboxPatch(
            (0.73, 0.15), 0.24, 0.70,
            boxstyle='round,pad=0.02',
            facecolor=badge_color, edgecolor='none',
        )
        ax.add_patch(badge)
        ax.text(
            0.85, 0.50, _fmt_chg(key, d['change'], d['pct']),
            color=WHITE, fontsize=9, fontweight='bold',
            va='center', ha='center',
        )

    # ── 3. チャート ────────────────────────────────────────────
    ax_c = fig.add_axes([0.08, 0.385, 0.82, 0.355])
    ax_c.set_facecolor(BG)

    sp_d  = market.get('S&P500', {'history': [], 'dates': []})
    oil_d = market.get('NY原油',  {'history': [], 'dates': []})
    n     = min(len(sp_d['history']), len(oil_d['history']))

    if n > 1:
        sp_h = sp_d['history'][-n:]
        oi_h = oil_d['history'][-n:]
        xs   = list(range(n))

        ax_r = ax_c.twinx()
        ax_c.plot(xs, sp_h, color=SP_LINE,  lw=2, zorder=3)
        ax_r.plot(xs, oi_h, color=OIL_LINE, lw=2, zorder=3)

        # 右端ラベル（xlimを少し広げてラベル用スペースを確保）
        xlim_max = n + int(n * 0.12)
        ax_c.set_xlim(0, xlim_max)
        ax_r.set_xlim(0, xlim_max)
        ax_c.text(n, sp_h[-1], '  S&P500', color=SP_LINE,  fontsize=8, va='center')
        ax_r.text(n, oi_h[-1], '  NY原油',  color=OIL_LINE, fontsize=8, va='center')

        # 月ラベル
        dates = sp_d['dates'][-n:]
        ticks, labels = [], []
        prev_m = None
        for i, d in enumerate(dates):
            if d.month != prev_m:
                ticks.append(i)
                labels.append(f'{d.month}月')
                prev_m = d.month
        ax_c.set_xticks(ticks)
        ax_c.set_xticklabels(labels, fontsize=9)

        ax_c.tick_params(axis='y', labelsize=8)
        ax_r.tick_params(axis='y', labelsize=8)
        ax_c.grid(axis='y', alpha=0.25, linestyle='--')
        ax_c.spines['top'].set_visible(False)
        ax_r.spines['top'].set_visible(False)

    # ── 4. ニュースセクションヘッダー ──────────────────────────
    ax_nh = fig.add_axes([0, 0.335, 1, 0.040])
    ax_nh.set_facecolor(NEWS_HDR)
    ax_nh.axis('off')
    ax_nh.text(
        0.025, 0.5, 'きょうのニュース',
        color=WHITE, fontsize=12, fontweight='bold', va='center',
    )

    # ── 5. ニュースカード (最大5件) ────────────────────────────
    card_h = 0.055
    gap    = 0.005
    top_y  = 0.330

    for i, title in enumerate(news_titles[:5]):
        y    = top_y - i * (card_h + gap) - card_h
        ax_n = fig.add_axes([0.01, y, 0.98, card_h])
        ax_n.set_facecolor(WHITE)
        ax_n.set_xlim(0, 1)
        ax_n.set_ylim(0, 1)
        ax_n.set_xticks([])
        ax_n.set_yticks([])
        for sp in ax_n.spines.values():
            sp.set_color(BORDER)
            sp.set_linewidth(0.8)
        ax_n.spines['left'].set_color(NEWS_HDR)
        ax_n.spines['left'].set_linewidth(4)

        short = (title[:28] + '…') if len(title) > 28 else title
        ax_n.text(0.025, 0.5, short, color=TEXT, fontsize=10, va='center')

    # ── 保存 ────────────────────────────────────────────────────
    tmp = tempfile.NamedTemporaryFile(suffix='.png', delete=False)
    fig.savefig(tmp.name, dpi=150, bbox_inches='tight',
                facecolor=BG, pad_inches=0.15)
    plt.close(fig)
    print(f'[INFO] 画像生成: {tmp.name}')
    return tmp.name


def build_tweet_text(market: dict, now: datetime.datetime) -> str:
    """ツイートテキストを組み立てる"""
    wd  = WEEKDAY_JA[now.weekday()]
    sp  = market.get('S&P500', {'value': 0.0, 'pct': 0.0})
    vix = market.get('VIX',    {'value': 0.0})
    oil = market.get('NY原油',  {'value': 0.0, 'pct': 0.0})
    fx  = market.get('ドル円',  {'value': 0.0})

    sign_s = '+' if sp['pct']  >= 0 else ''
    sign_o = '+' if oil['pct'] >= 0 else ''

    if sp['pct'] > 0.5:
        mood = '株式市場は上昇しました'
    elif sp['pct'] < -0.5:
        mood = '株式市場は下落しました'
    else:
        mood = '株式市場はほぼ横ばいでした'

    vix_note = ''
    if vix['value'] > 25:
        vix_note = '　VIXが高水準で、市場の緊張感が続いています。'
    elif vix['value'] < 15:
        vix_note = '　VIXが低く、市場は落ち着いた動きです。'

    return (
        f'◆ {now.month}/{now.day}（{wd}）市場サマリー\n\n'
        f'{mood}。{vix_note}\n\n'
        f'S&P500: {sp["value"]:,.0f} ({sign_s}{sp["pct"]:.1f}%)\n'
        f'VIX: {vix["value"]:.2f}\n'
        f'NY原油: {oil["value"]:.2f} ({sign_o}{oil["pct"]:.1f}%)\n'
        f'ドル円: {fx["value"]:.2f}'
    )


def post_tweet(text: str, image_path: str) -> None:
    """X(Twitter)に画像付きツイートを投稿する。

    必要な環境変数:
      TWITTER_API_KEY, TWITTER_API_SECRET,
      TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_SECRET
    (Twitter Developer Portal で Basic/Pro プランが必要)
    """
    required = [
        'TWITTER_API_KEY', 'TWITTER_API_SECRET',
        'TWITTER_ACCESS_TOKEN', 'TWITTER_ACCESS_SECRET',
    ]
    missing = [k for k in required if not os.environ.get(k)]
    if missing:
        print(f'[INFO] Twitter認証情報 {missing} が未設定のためスキップします。')
        return

    api_key       = os.environ['TWITTER_API_KEY']
    api_secret    = os.environ['TWITTER_API_SECRET']
    access_token  = os.environ['TWITTER_ACCESS_TOKEN']
    access_secret = os.environ['TWITTER_ACCESS_SECRET']

    # v1.1 API でメディアをアップロード
    auth   = tweepy.OAuth1UserHandler(api_key, api_secret, access_token, access_secret)
    api_v1 = tweepy.API(auth)
    media  = api_v1.media_upload(image_path)
    print(f'[INFO] メディアアップロード完了: media_id={media.media_id}')

    # v2 API でツイートを投稿
    client = tweepy.Client(
        consumer_key=api_key,
        consumer_secret=api_secret,
        access_token=access_token,
        access_token_secret=access_secret,
    )
    resp = client.create_tweet(text=text, media_ids=[str(media.media_id)])
    print(f'[INFO] ツイート投稿完了: id={resp.data["id"]}')


def main() -> None:
    now = datetime.datetime.now(JST)
    print(f'[INFO] 実行開始: {now.strftime("%Y-%m-%d %H:%M JST")}')

    # 市場データ取得
    print('[INFO] 市場データ取得中...')
    market = fetch_market_data()
    for k, v in market.items():
        s = '+' if v['pct'] >= 0 else ''
        print(f'  {k}: {v["value"]:.2f} ({s}{v["pct"]:.2f}%)')

    # ニュース取得（fetch_news.py を再利用）
    print('[INFO] ニュース取得中...')
    all_news = fetch_all_news()
    seen: set = set()
    top_news: list = []
    for articles in all_news.values():
        for a in articles[:3]:
            t = a['title']
            if t not in seen:
                seen.add(t)
                top_news.append(t)
    print(f'[INFO] ニュース {len(top_news)} 件取得')

    # 画像生成
    print('[INFO] 画像生成中...')
    img_path = generate_image(market, top_news, now)

    # ツイートテキスト生成
    tweet_text = build_tweet_text(market, now)
    print(f'[INFO] ツイートテキスト:\n{tweet_text}\n')

    # X(Twitter)に投稿
    print('[INFO] X(Twitter)に投稿中...')
    post_tweet(tweet_text, img_path)

    # 一時ファイルを削除
    try:
        os.unlink(img_path)
    except Exception:
        pass

    print('[INFO] 完了')


if __name__ == '__main__':
    main()
