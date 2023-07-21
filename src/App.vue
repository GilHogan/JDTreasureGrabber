<template>
	<div id="app">
		<el-row class="app-above">
			<el-col :span="24" class="app-above__col">
				<item-info @go-to-bid="goToBid" @fetchBidDetail="fetchBidDetail" @update-bid="updateDid">

				</item-info>
				<el-row>
					<el-col :span="12">
						<history-price :history-data="historyData">

						</history-price>
					</el-col>
					<el-col :span="11" style="margin-left: 20px;">
						<bid-info :info="info"></bid-info>
					</el-col>
				</el-row>
			</el-col>
		</el-row>
		<el-row class="app-under">
			<el-col :span="24">
				<ProductList :productSearchResult="productSearchResult" @fetchProduct="fetchProduct" @goToProductPage="handleGoToProductPage"/>
			</el-col>
		</el-row>


	</div>
</template>

<script>
import ItemInfo from "./components/ItemInfo";
import HistoryPrice from "./components/HistoryPrice";
import BidInfo from "./components/BidInfo";
import ProductList from "./components/ProductList";

export default {
	name: 'App',
	components: {
		BidInfo,
		HistoryPrice,
		ItemInfo,
		ProductList
	},
	data () {
		return {
			historyData: [],
			info: [],
			productSearchResult: {},
		}
	},
	mounted () {

	},
	methods: {
		goToBid (id, price, bidder, markup, lastBidCountdownTime, isFixedPrice) {
			window.startBid(id, price, bidder, markup, lastBidCountdownTime, isFixedPrice);
		},
		fetchBidDetail (id) {
			window.fetchBidDetail(id).then(data => {
				console.log("App fetchBidDetail data = ", data);
				if (data) {
					this.historyData = data.historyRecord || [];
					this.info = data;
				} else {
					this.historyData = [];
					this.info = [];
				}
			}).catch(e => console.log("App fetchBidDetail error = ", e));
		},
		updateDid (id, price, bidder, markup, lastBidCountdownTime, isFixedPrice) {
			window.startUpdateBid(id, price, bidder, markup, lastBidCountdownTime, isFixedPrice);
		},
		fetchProduct (params = {}) {
			const { name, pageNo, status } = params;
			window.fetchProduct(name, pageNo, status).then(data => {
				if (data) {
					this.productSearchResult = data || {};
				} else {
					this.productSearchResult = {};
				}
			}).catch(e => console.log("App fetchProduct error = ", e));
		},
		handleGoToProductPage (productId) {
			window.handleGoToProductPage(productId);
		},
	}
}
</script>

<style>
#app {
	font-family: Avenir, Helvetica, Arial, sans-serif;
	-webkit-font-smoothing: antialiased;
	-moz-osx-font-smoothing: grayscale;
	text-align: center;
	color: #2c3e50;
	margin-top: 20px;
}

.app-above {
	border: 2px black solid;

}

.app-above__col {
	padding: 10px 10px;
}

.app-under {
	border: 2px black solid;
	margin-top: 15px;
}

.app-title {
	text-align: left;
	color: #303133;
	font-size: 16;
	font-weight: 700;
}
</style>
